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

interface ClaimLine {
  line_number: number;
  diagnosis_code: string;
  procedure_code: string;
  tariff_code: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
}

export async function POST(request: NextRequest) {
  try {
    // Require provider authentication
    const user = await requireRole(request, 'provider');
    
    const body = await request.json();

    // Validate required fields
    const requiredFields = ['member_id', 'service_date', 'claim_type', 'benefit_type', 'claim_lines'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate claim_lines is an array with at least one line
    if (!Array.isArray(body.claim_lines) || body.claim_lines.length === 0) {
      return NextResponse.json(
        { error: 'claim_lines must be an array with at least one line item' },
        { status: 400 }
      );
    }

    // Use provider_id from authenticated user
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
      .select('id, member_number, status, plan_name, plan_id, start_date, email, mobile, first_name, last_name, email_consent, sms_consent')
      .eq('id', body.member_id)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    if (member.status !== 'active') {
      return NextResponse.json(
        { error: 'Member is not active' },
        { status: 400 }
      );
    }

    // Calculate total claimed amount from all lines
    const totalClaimedAmount = body.claim_lines.reduce(
      (sum: number, line: ClaimLine) => sum + line.total_amount,
      0
    );

    // Generate claim number (format: CLM-YYYYMMDD-XXX)
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    
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
      console.log(`⚠️ Multi-line claim auto-pended: Waiting period not met for member ${member.member_number}`);
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
      } else if (preauth.used) {
        initialStatus = 'pended';
        pendedReason = pendedReason 
          ? `${pendedReason}; Pre-authorization already used`
          : 'Pre-authorization already used';
      } else {
        const today = new Date();
        const validUntil = new Date(preauth.valid_until);
        if (today > validUntil) {
          initialStatus = 'pended';
          pendedReason = pendedReason 
            ? `${pendedReason}; Pre-authorization expired`
            : 'Pre-authorization expired';
        }
      }
    }

    // Check for high-value claims (potential fraud alert)
    const fraudAlertTriggered = totalClaimedAmount > 50000;
    const fraudRiskScore = fraudAlertTriggered ? 50 : 0;

    // Create claim
    const { data: claim, error } = await supabaseAdmin
      .from('claims')
      .insert({
        claim_number: claimNumber,
        member_id: body.member_id,
        provider_id: providerId,
        service_date: body.service_date,
        claimed_amount: totalClaimedAmount,
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

    // Insert claim lines
    const claimLinesData = body.claim_lines.map((line: ClaimLine) => ({
      claim_id: claim.id,
      line_number: line.line_number,
      diagnosis_code: line.diagnosis_code,
      procedure_code: line.procedure_code,
      tariff_code: line.tariff_code,
      quantity: line.quantity,
      unit_price: line.unit_price,
      total_amount: line.total_amount,
      status: 'pending'
    }));

    const { error: linesError } = await supabaseAdmin
      .from('claim_lines')
      .insert(claimLinesData);

    if (linesError) {
      console.error('Error creating claim lines:', linesError);
      // Rollback: delete the claim
      await supabaseAdmin.from('claims').delete().eq('id', claim.id);
      return NextResponse.json(
        { error: 'Failed to create claim lines', details: linesError.message },
        { status: 500 }
      );
    }

    // Create audit trail entry
    const auditNotes = initialStatus === 'pended' 
      ? `Multi-line claim submitted and auto-pended: ${pendedReason}`
      : `Multi-line claim submitted with ${body.claim_lines.length} line items`;
    
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
          provider_id: providerId,
          alert_type: 'high_value',
          severity: 'medium',
          description: `High-value multi-line claim submitted: R${totalClaimedAmount.toLocaleString()}`,
          related_claims: [claim.id],
          status: 'open'
        });
    }

    // Send notification to member
    try {
      const recipient = {
        email: member.email,
        mobile: member.mobile,
        firstName: member.first_name,
        lastName: member.last_name
      };

      const preferences = {
        emailConsent: member.email_consent !== false,
        smsConsent: member.sms_consent !== false
      };

      await sendNotification(
        'claim_submitted',
        recipient,
        {
          claimNumber: claimNumber,
          serviceDate: body.service_date,
          claimedAmount: totalClaimedAmount
        },
        preferences
      );
      console.log(`✅ Multi-line claim submission notification sent for ${claimNumber}`);
    } catch (notificationError) {
      console.error('❌ Error sending notification:', notificationError);
    }

    console.log(`✅ Multi-line claim submitted: ${claimNumber}`);
    console.log(`   Member: ${member.member_number}`);
    console.log(`   Provider: ${providerId}`);
    console.log(`   Line items: ${body.claim_lines.length}`);
    console.log(`   Total amount: R${totalClaimedAmount}`);

    return NextResponse.json({
      success: true,
      claim,
      claim_number: claimNumber,
      line_count: body.claim_lines.length,
      total_amount: totalClaimedAmount,
      message: 'Multi-line claim submitted successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error submitting multi-line claim:', error);
    
    // Handle authentication errors
    if (error.message.includes('Access denied') || error.message.includes('Authentication required')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Access denied') ? 403 : 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
