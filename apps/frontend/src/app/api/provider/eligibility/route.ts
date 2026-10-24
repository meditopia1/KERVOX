import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/auth-server';

// Waiting periods by benefit type (in days)
const WAITING_PERIODS = {
  general: 90,        // 3 months - GP, dental, optical
  specialist: 90,     // 3 months - Specialist consultations
  hospital: 90,       // 3 months - Hospital admissions
  maternity: 365,     // 12 months - Maternity benefits
  pre_existing: 365   // 12 months - Pre-existing conditions
};

// Map benefit types to waiting period categories
const BENEFIT_WAITING_PERIOD_MAP: { [key: string]: keyof typeof WAITING_PERIODS } = {
  'gp_visit': 'general',
  'dental': 'general',
  'optical': 'general',
  'specialist': 'specialist',
  'hospital': 'hospital',
  'maternity': 'maternity',
  'pharmacy': 'general',
  'pathology': 'general',
  'radiology': 'general',
  'physiotherapy': 'specialist',
  'psychology': 'specialist',
  'chronic_medication': 'general'
};

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!user.isProvider || !user.providerId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const body = await request.json();
    const { member_number, id_number, patient_name, date_of_birth } = body;
    const normalizedMemberNumber = typeof member_number === 'string' ? member_number.trim() : '';
    const normalizedIdNumber = typeof id_number === 'string' ? id_number.trim() : '';
    const normalizedPatientName = typeof patient_name === 'string' ? patient_name.trim() : '';
    const normalizedDOB = typeof date_of_birth === 'string' ? date_of_birth.trim() : '';

    const nameParts = normalizedPatientName.split(/\s+/).filter(Boolean);
    if ((!normalizedMemberNumber && !normalizedIdNumber && !(nameParts.length >= 2 && normalizedDOB)) ||
        (normalizedDOB && !/^\d{4}-\d{2}-\d{2}$/.test(normalizedDOB)) ||
        normalizedMemberNumber.length > 80 || normalizedIdNumber.length > 80 || normalizedPatientName.length > 160) {
      return NextResponse.json(
        { error: 'Provide a member number, ID number, or full name with date of birth' },
        { status: 400 }
      );
    }

    // Exact identifiers only. A fuzzy name query can expose unrelated member records.
    let query = supabaseAdmin
      .from('members')
      .select(`
        id,
        member_number,
        first_name,
        last_name,
        id_number,
        date_of_birth,
        status,
        payment_status,
        plan_name,
        monthly_premium,
        start_date,
        email,
      mobile
      `);

    if (normalizedMemberNumber) query = query.eq('member_number', normalizedMemberNumber);
    if (normalizedIdNumber) query = query.eq('id_number', normalizedIdNumber);
    if (!normalizedMemberNumber && !normalizedIdNumber) {
      query = query.eq('first_name', nameParts[0])
        .eq('last_name', nameParts.slice(1).join(' '))
        .eq('date_of_birth', normalizedDOB);
    }
    const { data: member, error } = await query.maybeSingle();

    if (error || !member) {
      return NextResponse.json({
        eligible: false,
        message: 'Member not found',
        member: null
      });
    }

    // Verify date of birth if provided
    if (normalizedDOB && member.date_of_birth) {
      if (normalizedDOB !== String(member.date_of_birth).slice(0, 10)) {
        return NextResponse.json({
          eligible: false,
          message: 'Date of birth does not match',
          member: null
        });
      }
    }

    // Derive member eligibility from the reflected payment status on the member record
    const paymentStatus = typeof member.payment_status === 'string'
      ? member.payment_status.trim().toLowerCase()
      : '';
    const effectiveStatus = paymentStatus === 'active' ? 'active' : 'suspended';
    const persistedPaymentStatus = paymentStatus || effectiveStatus;

    if (member.status !== effectiveStatus || member.payment_status !== persistedPaymentStatus) {
      const { error: syncError } = await supabaseAdmin
        .from('members')
        .update({
          status: effectiveStatus,
          payment_status: persistedPaymentStatus
        })
        .eq('id', member.id);

      if (syncError) {
        console.error('Failed to sync member eligibility status:', syncError);
      } else {
        member.status = effectiveStatus;
        member.payment_status = persistedPaymentStatus;
      }
    }

    if (effectiveStatus !== 'active') {
      return NextResponse.json({
        eligible: false,
        message: 'Member is suspended',
        member: {
          id: member.id,
          member_number: member.member_number,
          first_name: member.first_name,
          last_name: member.last_name,
          id_number: member.id_number,
          date_of_birth: member.date_of_birth,
          status: effectiveStatus,
          payment_status: persistedPaymentStatus,
          plan_name: member.plan_name,
          monthly_premium: member.monthly_premium,
          start_date: member.start_date,
          email: member.email,
          mobile: member.mobile
        }
      });
    }

    // Fetch dependants
    const { data: dependants } = await supabaseAdmin
      .from('member_dependants')
      .select('first_name, last_name, id_number, relationship, status')
      .eq('member_id', member.id)
      .eq('status', 'active');

    // Fetch benefit usage for current year
    const currentYear = new Date().getFullYear();
    const { data: benefitUsage } = await supabaseAdmin
      .from('benefit_usage')
      .select('benefit_type, total_limit_amount, total_limit_count, used_amount, used_count, remaining_amount, remaining_count')
      .eq('member_id', member.id)
      .eq('year', currentYear);

    // Calculate waiting periods
    const waitingPeriods: { [key: string]: { completed: boolean; daysRemaining: number; requiredDays: number } } = {};
    
    if (member.start_date) {
      const startDate = new Date(member.start_date);
      const today = new Date();
      const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      // Calculate for each waiting period category
      Object.entries(WAITING_PERIODS).forEach(([category, requiredDays]) => {
        const completed = daysSinceStart >= requiredDays;
        const daysRemaining = completed ? 0 : requiredDays - daysSinceStart;
        
        waitingPeriods[category] = {
          completed,
          daysRemaining,
          requiredDays
        };
      });
    }

    // Parse benefit usage to create a benefits summary
    const benefitsSummary: { [key: string]: any } = {};
    
    if (benefitUsage && benefitUsage.length > 0) {
      benefitUsage.forEach((usage: any) => {
        const waitingPeriodCategory = BENEFIT_WAITING_PERIOD_MAP[usage.benefit_type] || 'general';
        const waitingPeriodStatus = waitingPeriods[waitingPeriodCategory];
        
        benefitsSummary[usage.benefit_type] = {
          total_limit_amount: usage.total_limit_amount,
          total_limit_count: usage.total_limit_count,
          used_amount: usage.used_amount || 0,
          used_count: usage.used_count || 0,
          remaining_amount: usage.remaining_amount,
          remaining_count: usage.remaining_count,
          waiting_period: waitingPeriodStatus || { completed: false, daysRemaining: 0, requiredDays: 0 }
        };
      });
    }

    return NextResponse.json({
      eligible: true,
      message: 'Member is active and eligible',
      member: {
        id: member.id,
        member_number: member.member_number,
        first_name: member.first_name,
        last_name: member.last_name,
        id_number: member.id_number,
        date_of_birth: member.date_of_birth,
        status: effectiveStatus,
        payment_status: persistedPaymentStatus,
        plan_name: member.plan_name,
        monthly_premium: member.monthly_premium,
        start_date: member.start_date,
        email: member.email,
        mobile: member.mobile,
        dependants: (dependants || []).map((dependant) => ({
          name: [dependant.first_name, dependant.last_name].filter(Boolean).join(' '),
          idNumber: dependant.id_number,
          relationship: dependant.relationship,
          status: dependant.status
        })),
        benefits_summary: benefitsSummary,
        waiting_periods: waitingPeriods
      }
    });

  } catch (error: any) {
    console.error('Error checking eligibility:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
