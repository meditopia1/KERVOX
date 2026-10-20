import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAuthenticatedSupabaseClient, requireAnyRole } from '@/lib/auth-server';
import { sendNotification } from '@/lib/notifications';

// Initialize Supabase client with service role for admin operations
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
    // Require authentication - only claims assessors, admin, or operations can view claims
    await requireAnyRole(request, ['claims', 'admin', 'system_admin', 'operations_manager']);

    const supabase = createAuthenticatedSupabaseClient(request);
    const { id } = params;

    const { data: claim, error } = await supabase
      .from('claims')
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
      console.error('Error fetching claim:', error);
      return NextResponse.json(
        { error: 'Failed to fetch claim', details: error.message },
        { status: 500 }
      );
    }

    if (!claim) {
      return NextResponse.json(
        { error: 'Claim not found' },
        { status: 404 }
      );
    }

    // Fetch audit trail
    const { data: auditTrail } = await supabase
      .from('claim_audit_trail')
      .select('*')
      .eq('claim_id', id)
      .order('created_at', { ascending: false });

    // Fetch documents
    const { data: documents } = await supabase
      .from('claim_documents')
      .select('*')
      .eq('claim_id', id)
      .order('uploaded_at', { ascending: false });

    return NextResponse.json({
      claim,
      audit_trail: auditTrail || [],
      documents: documents || []
    });

  } catch (error: any) {
    console.error('Error in claim GET API:', error);
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
    // Require authentication - only claims assessors, admin, or operations can update claims
    const user = await requireAnyRole(request, ['claims', 'admin', 'operations_manager']);
    
    const { id } = params;
    const body = await request.json();
    const { action, notes, approved_amount, rejection_reason, pended_reason, additional_info_requested } = body;

    // Fetch current claim
    const { data: currentClaim, error: fetchError } = await supabaseAdmin
      .from('claims')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentClaim) {
      return NextResponse.json(
        { error: 'Claim not found' },
        { status: 404 }
      );
    }

    const previousStatus = currentClaim.status;
    let updateData: any = {
      updated_at: new Date().toISOString()
    };

    let auditAction = '';
    let newStatus = previousStatus;

    // Handle different actions
    switch (action) {
      case 'approve':
        updateData.status = 'approved';
        updateData.approved_amount = approved_amount || currentClaim.claimed_amount;
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by = user.id; // Set from authenticated user
        auditAction = 'approved';
        newStatus = 'approved';
        
        // Calculate processing time
        if (currentClaim.submission_date) {
          const submissionDate = new Date(currentClaim.submission_date);
          const now = new Date();
          const hoursDiff = (now.getTime() - submissionDate.getTime()) / (1000 * 60 * 60);
          updateData.processing_time_hours = Math.round(hoursDiff * 10) / 10;
        }

        // Mark pre-authorization as used if claim has pre-auth
        if (currentClaim.pre_auth_number) {
          await supabaseAdmin
            .from('pre_authorizations')
            .update({
              used: true,
              used_by_claim_id: id,
              used_at: new Date().toISOString()
            })
            .eq('preauth_number', currentClaim.pre_auth_number);

          console.log(`✅ Pre-authorization ${currentClaim.pre_auth_number} marked as used`);
        }
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
        
        // Calculate processing time
        if (currentClaim.submission_date) {
          const submissionDate = new Date(currentClaim.submission_date);
          const now = new Date();
          const hoursDiff = (now.getTime() - submissionDate.getTime()) / (1000 * 60 * 60);
          updateData.processing_time_hours = Math.round(hoursDiff * 10) / 10;
        }
        break;

      case 'pend':
        if (!pended_reason) {
          return NextResponse.json(
            { error: 'Pended reason is required' },
            { status: 400 }
          );
        }
        updateData.status = 'pended';
        updateData.pended_reason = pended_reason;
        updateData.pended_date = new Date().toISOString();
        updateData.additional_info_requested = additional_info_requested || '';
        auditAction = 'pended';
        newStatus = 'pended';
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be: approve, reject, or pend' },
          { status: 400 }
        );
    }

    // Update claim
    const { data: updatedClaim, error: updateError } = await supabaseAdmin
      .from('claims')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating claim:', updateError);
      return NextResponse.json(
        { error: 'Failed to update claim', details: updateError.message },
        { status: 500 }
      );
    }

    // Create audit trail entry
    await supabaseAdmin
      .from('claim_audit_trail')
      .insert({
        claim_id: id,
        action: auditAction,
        previous_status: previousStatus,
        new_status: newStatus,
        notes: notes || `Claim ${auditAction}`,
        performed_by: user.id // Set from authenticated user
      });

    // Send notifications to member
    if (currentClaim.member_id) {
      try {
        // Fetch member details for notification
        const { data: member } = await supabaseAdmin
          .from('members')
          .select('first_name, last_name, email, mobile, email_consent, sms_consent')
          .eq('id', currentClaim.member_id)
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

          // Send notification based on action
          if (action === 'approve') {
            await sendNotification(
              'claim_approved',
              recipient,
              {
                claimNumber: currentClaim.claim_number,
                claimedAmount: currentClaim.claimed_amount,
                approvedAmount: updateData.approved_amount,
                memberResponsibility: currentClaim.claimed_amount - updateData.approved_amount
              },
              preferences
            );
            console.log(`✅ Approval notification sent for claim ${currentClaim.claim_number}`);
          } else if (action === 'reject') {
            await sendNotification(
              'claim_rejected',
              recipient,
              {
                claimNumber: currentClaim.claim_number,
                rejectionReason: rejection_reason
              },
              preferences
            );
            console.log(`✅ Rejection notification sent for claim ${currentClaim.claim_number}`);
          } else if (action === 'pend') {
            await sendNotification(
              'claim_pended',
              recipient,
              {
                claimNumber: currentClaim.claim_number,
                pendedReason: pended_reason,
                additionalInfoRequested: additional_info_requested || ''
              },
              preferences
            );
            console.log(`✅ Pended notification sent for claim ${currentClaim.claim_number}`);
          }
        }
      } catch (notificationError) {
        // Log error but don't fail the request
        console.error('❌ Error sending notification:', notificationError);
      }
    }

    return NextResponse.json({
      success: true,
      claim: updatedClaim,
      message: `Claim ${auditAction} successfully`
    });

  } catch (error: any) {
    console.error('Error in claim PATCH API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
