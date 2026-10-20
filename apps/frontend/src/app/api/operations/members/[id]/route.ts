import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAuthenticatedSupabaseClient, requireAnyRole } from '@/lib/auth-server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAnyRole(request, ['operations_manager', 'system_admin', 'admin', 'finance_manager']);
    const supabase = createAuthenticatedSupabaseClient(request);

    const { data: member, error } = await supabase
      .from('members')
      .select('*, brokers(code, name)')
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Error fetching member:', error);
      return NextResponse.json(
        { error: 'Failed to fetch member', details: error.message },
        { status: 400 }
      );
    }

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const { count: dependentsCount } = await supabase
      .from('member_dependants')
      .select('*', { count: 'exact', head: true })
      .eq('member_number', member.member_number)
      .eq('status', 'active');

    const { data: dependents } = await supabase
      .from('member_dependants')
      .select('*')
      .eq('member_number', member.member_number)
      .eq('status', 'active')
      .order('created_at', { ascending: true });

    return NextResponse.json({
      id: member.id,
      memberNumber: member.member_number,
      firstName: member.first_name,
      lastName: member.last_name,
      idNumber: member.id_number,
      email: member.email,
      phone: member.mobile,
      mobile: member.mobile,
      status: member.status,
      brokerCode: member.broker_code,
      brokerName: (Array.isArray(member.brokers) ? member.brokers[0]?.name : member.brokers?.name) || 'N/A',
      policyNumber: member.member_number,
      product: member.plan_name,
      planId: member.plan_id,
      planStartDate: member.plan_start_date,
      paymentMethod: member.payment_method,
      monthlyPremium: member.monthly_premium || 0,
      joinDate: member.approved_at || member.created_at,
      riskScore: member.risk_score || 0,
      addressLine1: member.address_line1,
      addressLine2: member.address_line2,
      city: member.city,
      postalCode: member.postal_code,
      dateOfBirth: member.date_of_birth,
      gender: member.gender,
      bankName: member.bank_name,
      accountNumber: member.account_number,
      branchCode: member.branch_code,
      debitOrderDay: member.debit_order_day,
      suspensionReason: member.suspension_reason,
      suspensionDate: member.suspension_date,
      cancellationDate: member.cancellation_date,
      cancellationReason: member.cancellation_reason,
      activatedAt: member.activated_at,
      waitingPeriodEndDate: member.waiting_period_end_date,
      pmbWaitingPeriodEndDate: member.pmb_waiting_period_end_date,
      createdAt: member.created_at,
      updatedAt: member.updated_at,
      applicationId: member.application_id,
      dependentsCount: dependentsCount || 0,
      dependents: dependents || [],
    });
  } catch (error) {
    console.error('Error in GET /api/operations/members/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAnyRole(request, ['operations_manager', 'system_admin', 'admin']);
    const body = await request.json();

    const { data: member, error } = await supabaseAdmin
      .from('members')
      .update({
        member_number: body.member_number,
        first_name: body.first_name,
        last_name: body.last_name,
        id_number: body.id_number,
        date_of_birth: body.commence_date,
        monthly_premium: body.monthly_premium,
        phone: body.phone || null,
        email: body.email || null,
        payment_group_id: body.payment_group_id,
        collection_method: body.collection_method,
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating member:', error);
      return NextResponse.json({ 
        error: 'Failed to update member', 
        details: error.message 
      }, { status: 400 });
    }

    return NextResponse.json(member);
  } catch (error) {
    console.error('Error in PUT /api/operations/members/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  return PUT(request, context);
}
