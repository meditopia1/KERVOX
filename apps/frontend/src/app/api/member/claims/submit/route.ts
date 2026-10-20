import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateWaitingPeriod } from '@/lib/benefit-validation-server';
import { getAuthenticatedUser } from '@/lib/auth-server';

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
    // Get authenticated user (optional for member claims - can be submitted without auth)
    const { user } = await getAuthenticatedUser(request);
    
    const body = await request.json();

    // Validate required fields
    const requiredFields = ['member_id', 'service_date', 'claimed_amount', 'claim_type', 'benefit_type'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // If user is authenticated, verify they are submitting for themselves
    if (user && !user.isProvider) {
      // Find member record linked to this user
      const { data: memberData } = await supabaseAdmin
        .from('members')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (memberData && memberData.id !== body.member_id) {
        return NextResponse.json(
          { error: 'You can only submit claims for yourself' },
          { status: 403 }
        );
      }
    }

    // Verify member exists and is active
    const { data: member, error: memberError } = await supabaseAdmin
      .from('members')
      .select('id, member_number, status, payment_status, plan_name, plan_id')
      .eq('id', body.member_id)
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
      body.member_id,
      body.benefit_type,
      member.plan_id
    );

    // Determine initial status based on waiting period
    let initialStatus = 'pending';
    let pendedReason: string | null = null;
    
    if (!waitingPeriodValidation.valid) {
      initialStatus = 'pended';
      pendedReason = waitingPeriodValidation.errors.join('; ');
      console.log(`⚠️ Member refund claim auto-pended: Waiting period not met for member ${member.member_number}`);
      console.log(`   Benefit: ${body.benefit_type}`);
      console.log(`   Reason: ${pendedReason}`);
    }

    // Create claim (member-submitted refund claim)
    const { data: claim, error } = await supabaseAdmin
      .from('claims')
      .insert({
        claim_number: claimNumber,
        member_id: body.member_id,
        provider_id: body.provider_id || null, // Optional for refund claims
        service_date: body.service_date,
        claimed_amount: body.claimed_amount,
        claim_type: body.claim_type,
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
        { error: 'Failed to create claim', details: error.message },
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
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
