import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAnyRole } from '@/lib/auth-server';
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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require claims assessor, admin, or operations manager role
    await requireAnyRole(request, ['claims', 'admin', 'operations_manager']);
    
    const { id } = params;

    const { data: preauth, error } = await supabaseAdmin
      .from('pre_authorizations')
      .select(`
        *,
        members:member_id (
          id,
          member_number,
          first_name,
          last_name,
          email,
          mobile,
          plan_name,
          date_of_birth,
          id_number
        ),
        providers:provider_id (
          id,
          provider_number,
          name,
          practice_name,
          type,
          email,
          phone,
          address
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching pre-authorization:', error);
      return NextResponse.json(
        { error: 'Failed to fetch pre-authorization', details: error.message },
        { status: 500 }
      );
    }

    if (!preauth) {
      return NextResponse.json(
        { error: 'Pre-authorization not found' },
        { status: 404 }
      );
    }

    // Fetch audit trail
    const { data: auditTrail } = await supabaseAdmin
      .from('preauth_audit_trail')
      .select('*')
      .eq('preauth_id', id)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      preauth,
      audit_trail: auditTrail || []
    });

  } catch (error: any) {
    console.error('Error in pre-authorization GET API:', error);
    
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require claims assessor, admin, or operations manager role
    const user = await requireAnyRole(request, ['claims', 'admin', 'operations_manager']);
    
    const { id } = params;
    const body = await request.json();
    const { action, approved_amount, rejection_reason, notes } = body;

    // Fetch current pre-authorization
    const { data: currentPreauth, error: fetchError } = await supabaseAdmin
      .from('pre_authorizations')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentPreauth) {
      return NextResponse.json(
        { error: 'Pre-authorization not found' },
        { status: 404 }
      );
    }

    const previousStatus = currentPreauth.status;
    let updateData: any = {
      updated_at: new Date().toISOString()
    };

    let auditAction = '';
    let newStatus = previousStatus;

    // Handle different actions
    switch (action) {
      case 'approve':
        if (!approved_amount) {
          return NextResponse.json(
            { error: 'Approved amount is required' },
            { status: 400 }
          );
        }
        updateData.status = 'approved';
        updateData.approved_amount = approved_amount;
        updateData.approved_by = user.id;
        updateData.approved_at = new Date().toISOString();
        auditAction = 'approved';
        newStatus = 'approved';
        break;

      case 'reject':
        if (!rejection_reason) {
          return NextResponse.json(
            { error: 'Rejection reason is required' },
            { status: 400 }
          );
        }
        updateData.status = 'rejected';
        updateData.rejection_reason = rejection_reason;
        updateData.approved_amount = 0;
        auditAction = 'rejected';
        newStatus = 'rejected';
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be: approve or reject' },
          { status: 400 }
        );
    }

    // Update pre-authorization
    const { data: updatedPreauth, error: updateError } = await supabaseAdmin
      .from('pre_authorizations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating pre-authorization:', updateError);
      return NextResponse.json(
        { error: 'Failed to update pre-authorization', details: updateError.message },
        { status: 500 }
      );
    }

    // Create audit trail entry
    await supabaseAdmin
      .from('preauth_audit_trail')
      .insert({
        preauth_id: id,
        action: auditAction,
        performed_by: user.id,
        previous_status: previousStatus,
        new_status: newStatus,
        notes: notes || `Pre-authorization ${auditAction}`
      });

    console.log(`✅ Pre-authorization ${auditAction}: ${currentPreauth.preauth_number}`);
    console.log(`   By: ${user.email}`);
    if (action === 'approve') {
      console.log(`   Approved Amount: R${approved_amount}`);
    }

    // Send notification to member
    try {
      const { data: member } = await supabaseAdmin
        .from('members')
        .select('first_name, last_name, email, mobile, email_consent, sms_consent')
        .eq('id', currentPreauth.member_id)
        .single();

      if (member) {
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

        if (action === 'approve') {
          await sendNotification(
            'preauth_approved',
            recipient,
            {
              preauthNumber: currentPreauth.preauth_number,
              approvedAmount: approved_amount,
              validUntil: updatedPreauth.valid_until
            },
            preferences
          );
          console.log(`✅ Pre-auth approval notification sent for ${currentPreauth.preauth_number}`);
        } else if (action === 'reject') {
          await sendNotification(
            'preauth_rejected',
            recipient,
            {
              preauthNumber: currentPreauth.preauth_number,
              rejectionReason: rejection_reason
            },
            preferences
          );
          console.log(`✅ Pre-auth rejection notification sent for ${currentPreauth.preauth_number}`);
        }
      }
    } catch (notificationError) {
      // Log error but don't fail the request
      console.error('❌ Error sending notification:', notificationError);
    }

    return NextResponse.json({
      success: true,
      preauth: updatedPreauth,
      message: `Pre-authorization ${auditAction} successfully`
    });

  } catch (error: any) {
    console.error('Error in pre-authorization PATCH API:', error);
    
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
