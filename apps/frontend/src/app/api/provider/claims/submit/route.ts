import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateWaitingPeriod } from '@/lib/benefit-validation-server';
import { requireRole } from '@/lib/auth-server';
import { sendNotification } from '@/lib/notifications';

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
    // Require provider authentication
    const user = await requireRole(request, 'provider');
    
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

    // Use provider_id from authenticated user if not provided
    const providerId = body.provider_id || user.providerId;
    
    if (!providerId) {
      return NextResponse.json(
        { error: 'Provider ID not found' },
        { status: 400 }
      );
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
      console.log(`⚠️ Claim auto-pended: Waiting period not met for member ${member.member_number}`);
      console.log(`   Benefit: ${body.benefit_type}`);
      console.log(`   Reason: ${pendedReason}`);
    }

    // Validate pre-authorization if required
    if (body.pre_auth_required && body.pre_auth_number) {
      const { data: preauth } = await supabaseAdmin
        .from('pre_authorizations')
        .select('*')
        .eq('preauth_number', body.pre_auth_number)
        .eq('member_id', body.member_id)
        .eq('status', 'approved')
        .single();

      if (!preauth) {
        initialStatus = 'pended';
        pendedReason = pendedReason 
          ? `${pendedReason}; Pre-authorization not found or not approved`
          : 'Pre-authorization not found or not approved';
        console.log(`⚠️ Claim auto-pended: Invalid pre-authorization ${body.pre_auth_number}`);
      } else if (preauth.used) {
        initialStatus = 'pended';
        pendedReason = pendedReason 
          ? `${pendedReason}; Pre-authorization already used`
          : 'Pre-authorization already used';
        console.log(`⚠️ Claim auto-pended: Pre-authorization ${body.pre_auth_number} already used`);
      } else {
        // Check if pre-auth is still valid
        const today = new Date();
        const validUntil = new Date(preauth.valid_until);
        if (today > validUntil) {
          initialStatus = 'pended';
          pendedReason = pendedReason 
            ? `${pendedReason}; Pre-authorization expired`
            : 'Pre-authorization expired';
          console.log(`⚠️ Claim auto-pended: Pre-authorization ${body.pre_auth_number} expired`);
        }
      }
    } else if (body.pre_auth_required && !body.pre_auth_number) {
      // Pre-auth required but not provided
      initialStatus = 'pended';
      pendedReason = pendedReason 
        ? `${pendedReason}; Pre-authorization required but not provided`
        : 'Pre-authorization required but not provided';
      console.log(`⚠️ Claim auto-pended: Pre-authorization required but not provided`);
    }

    // Check for high-value claims (potential fraud alert)
    const claimedAmount = parseFloat(body.claimed_amount);
    const fraudAlertTriggered = claimedAmount > 50000;
    const fraudRiskScore = fraudAlertTriggered ? 50 : 0;

    // Create claim
    const { data: claim, error } = await supabaseAdmin
      .from('claims')
      .insert({
        claim_number: claimNumber,
        member_id: body.member_id,
        provider_id: providerId, // Use authenticated provider ID
        service_date: body.service_date,
        claimed_amount: body.claimed_amount,
        claim_type: body.claim_type,
        benefit_type: body.benefit_type,
        icd10_codes: body.icd10_codes || [],
        tariff_codes: body.tariff_codes || [],
        pre_auth_number: body.pre_auth_number,
        pre_auth_required: body.pre_auth_required || false,
        is_pmb: body.is_pmb || false,
        claim_source: 'provider',
        submission_method: 'portal',
        document_urls: body.document_urls || [],
        claim_data: body.claim_data || {},
        status: initialStatus,
        pended_reason: pendedReason,
        pended_date: initialStatus === 'pended' ? new Date().toISOString() : null,
        submission_date: new Date().toISOString(),
        fraud_alert_triggered: fraudAlertTriggered,
        fraud_risk_score: fraudRiskScore
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
      ? `Claim submitted and auto-pended: ${pendedReason}`
      : 'Claim submitted by provider via portal';
    
    await supabaseAdmin
      .from('claim_audit_trail')
      .insert({
        claim_id: claim.id,
        action: 'submitted',
        new_status: initialStatus,
        notes: auditNotes
      });

    // If fraud alert triggered, create provider fraud alert
    if (fraudAlertTriggered) {
      await supabaseAdmin
        .from('provider_fraud_alerts')
        .insert({
          provider_id: providerId, // Use authenticated provider ID
          alert_type: 'high_value',
          severity: 'medium',
          description: `High-value claim submitted: R${claimedAmount.toLocaleString()}`,
          related_claims: [claim.id],
          status: 'open'
        });
    }

    // Send notification to member
    try {
      const { data: memberDetails } = await supabaseAdmin
        .from('members')
        .select('first_name, last_name, email, mobile, email_consent, sms_consent')
        .eq('id', body.member_id)
        .single();

      if (memberDetails) {
        const recipient = {
          email: memberDetails.email,
          mobile: memberDetails.mobile,
          firstName: memberDetails.first_name,
          lastName: memberDetails.last_name
        };

        const preferences = {
          emailConsent: memberDetails.email_consent !== false,
          smsConsent: memberDetails.sms_consent !== false
        };

        await sendNotification(
          'claim_submitted',
          recipient,
          {
            claimNumber: claimNumber,
            serviceDate: body.service_date,
            claimedAmount: claimedAmount
          },
          preferences
        );
        console.log(`✅ Claim submission notification sent for ${claimNumber}`);
      }
    } catch (notificationError) {
      // Log error but don't fail the request
      console.error('❌ Error sending notification:', notificationError);
    }

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
