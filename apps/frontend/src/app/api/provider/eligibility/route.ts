import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    const body = await request.json();
    const { member_number, id_number, patient_name, date_of_birth } = body;
    const normalizedMemberNumber = typeof member_number === 'string' ? member_number.trim() : '';
    const normalizedIdNumber = typeof id_number === 'string' ? id_number.trim() : '';
    const normalizedPatientName = typeof patient_name === 'string' ? patient_name.trim() : '';

    if (!normalizedMemberNumber && !normalizedIdNumber && !normalizedPatientName) {
      return NextResponse.json(
        { error: 'member_number, id_number, or patient_name is required' },
        { status: 400 }
      );
    }

    // Build a forgiving lookup so providers can search by either identifier
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
        broker_code,
        start_date,
        email,
      mobile
      `)
      .limit(10);

    if (normalizedPatientName) {
      const nameTerms = normalizedPatientName
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);

      if (nameTerms.length > 0) {
        query = query.or(
          nameTerms
            .map((term) => `first_name.ilike.%${term}%,last_name.ilike.%${term}%`)
            .join(',')
        );
      }
    } else if (normalizedMemberNumber && normalizedIdNumber) {
      query = query.or(
        `member_number.ilike.${normalizedMemberNumber},id_number.eq.${normalizedIdNumber}`
      );
    } else if (normalizedMemberNumber) {
      query = query.ilike('member_number', normalizedMemberNumber);
    } else {
      query = query.eq('id_number', normalizedIdNumber);
    }

    const { data: memberCandidates, error } = await query;

    const member =
      memberCandidates?.find((candidate) =>
        normalizedPatientName &&
        normalizedPatientName
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean)
          .every((term) =>
            `${candidate.first_name || ''} ${candidate.last_name || ''}`
              .toLowerCase()
              .includes(term)
          )
      ) ||
      memberCandidates?.find((candidate) =>
        normalizedMemberNumber &&
        normalizedIdNumber &&
        candidate.member_number?.toLowerCase() === normalizedMemberNumber.toLowerCase() &&
        candidate.id_number === normalizedIdNumber
      ) ||
      memberCandidates?.find((candidate) =>
        normalizedMemberNumber &&
        candidate.member_number?.toLowerCase() === normalizedMemberNumber.toLowerCase()
      ) ||
      memberCandidates?.find((candidate) =>
        normalizedIdNumber &&
        candidate.id_number === normalizedIdNumber
      ) ||
      null;

    if (error || !member) {
      return NextResponse.json({
        eligible: false,
        message: 'Member not found',
        member: null
      });
    }

    // Verify date of birth if provided
    if (date_of_birth && member.date_of_birth) {
      const providedDOB = new Date(date_of_birth).toISOString().split('T')[0];
      const memberDOB = new Date(member.date_of_birth).toISOString().split('T')[0];
      
      if (providedDOB !== memberDOB) {
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
          broker_code: member.broker_code,
          start_date: member.start_date,
          email: member.email,
          mobile: member.mobile
        }
      });
    }

    // Fetch dependants
    const { data: dependants } = await supabaseAdmin
      .from('member_dependants')
      .select('*')
      .eq('member_id', member.id)
      .eq('status', 'active');

    // Fetch benefit usage for current year
    const currentYear = new Date().getFullYear();
    const { data: benefitUsage } = await supabaseAdmin
      .from('benefit_usage')
      .select('*')
      .eq('member_id', member.id)
      .eq('year', currentYear);

    // Fetch recent claims (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const { data: recentClaims } = await supabaseAdmin
      .from('claims')
      .select('id, claim_number, service_date, claim_type, claimed_amount, approved_amount, status')
      .eq('member_id', member.id)
      .gte('service_date', sixMonthsAgo.toISOString().split('T')[0])
      .order('service_date', { ascending: false })
      .limit(10);

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
        broker_code: member.broker_code,
        start_date: member.start_date,
        email: member.email,
        mobile: member.mobile,
        dependants: dependants || [],
        benefit_usage: benefitUsage || [],
        benefits_summary: benefitsSummary,
        waiting_periods: waitingPeriods,
        recent_claims: recentClaims || []
      }
    });

  } catch (error: any) {
    console.error('Error checking eligibility:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}