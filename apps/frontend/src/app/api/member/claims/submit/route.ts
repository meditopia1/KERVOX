import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateWaitingPeriod } from '@/lib/benefit-validation-server';
import { getAuthenticatedMemberId } from '@/lib/member-session';

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
    const memberId = await getAuthenticatedMemberId(request);
    if (!memberId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    
    const body = await request.json();
    if (body.member_id && body.member_id !== memberId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate required fields
    const requiredFields = ['service_date', 'claimed_amount', 'benefit_type'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    if (!Number.isFinite(Number(body.claimed_amount)) || Number(body.claimed_amount) <= 0) {
      return NextResponse.json({ error: 'Invalid claimed amount' }, { status: 400 });
    }

    // Verify member exists and is active
    const { data: member, error: memberError } = await supabaseAdmin
      .from('members')
      .select('id, member_number, status, payment_status, plan_name, plan_id')
      .eq('id', memberId)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    const effectiveStatus = typeof member.payment_status === 'string' && member.payment_status.trim().toLowerCase() === 'active'
      ? 'active'
      : 'suspended';

    if (effectiveStatus !== 'active') {
      return NextResponse.json(
        { error: 'Member is suspended' },
        { status: 400 }
      );
    }

    // Generate claim number (format: CLM-YYYYMMDD-XXX)
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    
    // Get count of claims today to generate sequence number
    const { data: todayClaims } = await supabaseAdmin
      .from('claims')
      .select('claim_number')
      .like('claim_number', `CLM-${dateStr}-%`);
    
    const sequence = String((todayClaims?.length || 0) + 1).padStart(3, '0');
    const claimNumber = `CLM-${dateStr}-${sequence}`;

    // Validate waiting period
    const waitingPeriodValidation = await validateWaitingPeriod(
      supabaseAdmin,
      memberId,
      body.benefit_type,
      member.plan_id
    );

    // Determine initial status based on waiting period
    let initialStatus = 'pending';
    let pendedReason: string | null = null;
    
    if (!waitingPeriodValidation.valid) {
      initialStatus = 'pended';
      pendedReason = waitingPeriodValidation.errors.join('; ');
      console.log('Member refund claim auto-pended: waiting period not met');
      console.log(`   Benefit: ${body.benefit_type}`);
      console.log(`   Reason: ${pendedReason}`);
    }

    // Create claim (member-submitted refund claim)
    const { data: claim, error } = await supabaseAdmin
      .from('claims')
      .insert({
        claim_number: claimNumber,
        member_id: memberId,
        provider_id: null,
        service_date: body.service_date,
        claimed_amount: body.claimed_amount,
        claim_type: 'member_refund',
        benefit_type: body.benefit_type,
        icd10_codes: body.icd10_codes || [],
        tariff_codes: body.tariff_codes || [],
        claim_source: 'member',
        submission_method: 'portal',
        document_urls: body.document_urls || [],
        claim_data: body.claim_data || {},
        status: initialStatus,
        pended_reason: pendedReason,
        pended_date: initialStatus === 'pended' ? new Date().toISOString() : null,
        submission_date: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating claim:', error);
      return NextResponse.json(
        { error: 'Failed to create claim' },
        { status: 500 }
      );
    }

    // Create audit trail entry
    const auditNotes = initialStatus === 'pended' 
      ? `Refund claim submitted and auto-pended: ${pendedReason}`
      : 'Refund claim submitted by member via portal';
    
    await supabaseAdmin
      .from('claim_audit_trail')
      .insert({
        claim_id: claim.id,
        action: 'submitted',
        new_status: initialStatus,
        notes: auditNotes
      });

    return NextResponse.json({
      success: true,
      claim,
      claim_number: claimNumber,
      message: 'Claim submitted successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error submitting claim:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
