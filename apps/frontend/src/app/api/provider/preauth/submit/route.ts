import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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
    const requiredFields = ['member_id', 'service_date', 'estimated_cost', 'diagnosis_codes', 'procedure_codes'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Use provider_id from authenticated user
    const providerId = user.providerId;
    
    if (!providerId) {
      return NextResponse.json(
        { error: 'Provider ID not found' },
        { status: 400 }
      );
    }

    // Verify member exists and is active
    const { data: member, error: memberError } = await supabaseAdmin
      .from('members')
      .select('id, member_number, status, plan_name')
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

    // Generate pre-auth number (format: PA-YYYYMMDD-XXX)
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    
    // Get count of pre-auths today to generate sequence number
    const { data: todayPreauths } = await supabaseAdmin
      .from('pre_authorizations')
      .select('preauth_number')
      .like('preauth_number', `PA-${dateStr}-%`);
    
    const sequence = String((todayPreauths?.length || 0) + 1).padStart(3, '0');
    const preauthNumber = `PA-${dateStr}-${sequence}`;

    // Calculate validity period (default: 30 days from approval)
    const validFrom = new Date(body.service_date);
    const validUntil = new Date(validFrom);
    validUntil.setDate(validUntil.getDate() + 30); // Valid for 30 days

    // Create pre-authorization request
    const { data: preauth, error } = await supabaseAdmin
      .from('pre_authorizations')
      .insert({
        preauth_number: preauthNumber,
        member_id: body.member_id,
        provider_id: providerId,
        service_date: body.service_date,
        diagnosis_codes: body.diagnosis_codes,
        procedure_codes: body.procedure_codes,
        estimated_cost: body.estimated_cost,
        clinical_notes: body.clinical_notes || '',
        urgency: body.urgency || 'routine',
        status: 'pending',
        valid_from: validFrom.toISOString().split('T')[0],
        valid_until: validUntil.toISOString().split('T')[0],
        requested_date: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating pre-authorization:', error);
      return NextResponse.json(
        { error: 'Failed to create pre-authorization', details: error.message },
        { status: 500 }
      );
    }

    // Create audit trail entry
    await supabaseAdmin
      .from('preauth_audit_trail')
      .insert({
        preauth_id: preauth.id,
        action: 'submitted',
        new_status: 'pending',
        notes: 'Pre-authorization request submitted by provider'
      });

    console.log(`✅ Pre-authorization submitted: ${preauthNumber}`);
    console.log(`   Member: ${member.member_number}`);
    console.log(`   Provider: ${providerId}`);
    console.log(`   Estimated Cost: R${body.estimated_cost}`);

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
          'preauth_submitted',
          recipient,
          {
            preauthNumber: preauthNumber,
            serviceDate: body.service_date,
            estimatedCost: body.estimated_cost
          },
          preferences
        );
        console.log(`✅ Pre-auth submission notification sent for ${preauthNumber}`);
      }
    } catch (notificationError) {
      // Log error but don't fail the request
      console.error('❌ Error sending notification:', notificationError);
    }

    return NextResponse.json({
      success: true,
      preauth,
      preauth_number: preauthNumber,
      message: 'Pre-authorization request submitted successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error submitting pre-authorization:', error);
    
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
