import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAnyRole } from '@/lib/auth-server';

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
    // Require authentication
    await requireAnyRole(request, ['claims', 'admin', 'operations_manager']);
    
    const { id } = params;

    const { data: line, error } = await supabaseAdmin
      .from('claim_lines')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching claim line:', error);
      return NextResponse.json(
        { error: 'Failed to fetch claim line', details: error.message },
        { status: 500 }
      );
    }

    if (!line) {
      return NextResponse.json(
        { error: 'Claim line not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ line });

  } catch (error: any) {
    console.error('Error in claim line GET API:', error);
    
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
    // Require authentication
    const user = await requireAnyRole(request, ['claims', 'admin', 'operations_manager']);
    
    const { id } = params;
    const body = await request.json();
    const { action, approved_amount, rejection_reason, rejection_code, notes } = body;

    // Fetch current claim line
    const { data: currentLine, error: fetchError } = await supabaseAdmin
      .from('claim_lines')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentLine) {
      return NextResponse.json(
        { error: 'Claim line not found' },
        { status: 404 }
      );
    }

    const previousStatus = currentLine.status;
    let updateData: any = {
      updated_at: new Date().toISOString(),
      adjudicated_by: user.id,
      adjudicated_at: new Date().toISOString()
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
        updateData.rejection_code = rejection_code || null;
        updateData.approved_amount = 0;
        auditAction = 'rejected';
        newStatus = 'rejected';
        break;

      case 'pend':
        if (!rejection_reason) {
          return NextResponse.json(
            { error: 'Pended reason is required' },
            { status: 400 }
          );
        }
        updateData.status = 'pended';
        updateData.rejection_reason = rejection_reason;
        auditAction = 'pended';
        newStatus = 'pended';
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be: approve, reject, or pend' },
          { status: 400 }
        );
    }

    // Update claim line
    const { data: updatedLine, error: updateError } = await supabaseAdmin
      .from('claim_lines')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating claim line:', updateError);
      return NextResponse.json(
        { error: 'Failed to update claim line', details: updateError.message },
        { status: 500 }
      );
    }

    // Check if all lines are adjudicated
    const { data: allLines } = await supabaseAdmin
      .from('claim_lines')
      .select('status')
      .eq('claim_id', currentLine.claim_id);

    const allAdjudicated = allLines?.every(
      line => line.status === 'approved' || line.status === 'rejected'
    );

    // If all lines are adjudicated, update parent claim status
    if (allAdjudicated) {
      const allApproved = allLines?.every(line => line.status === 'approved');
      const allRejected = allLines?.every(line => line.status === 'rejected');
      
      let claimStatus = 'pending';
      if (allApproved) {
        claimStatus = 'approved';
      } else if (allRejected) {
        claimStatus = 'rejected';
      } else {
        claimStatus = 'approved'; // Partial approval
      }

      await supabaseAdmin
        .from('claims')
        .update({
          status: claimStatus,
          approved_at: new Date().toISOString(),
          approved_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentLine.claim_id);

      // Create audit trail for parent claim
      await supabaseAdmin
        .from('claim_audit_trail')
        .insert({
          claim_id: currentLine.claim_id,
          action: claimStatus,
          previous_status: 'pending',
          new_status: claimStatus,
          notes: `All claim lines adjudicated. Status: ${claimStatus}`,
          performed_by: user.id
        });

      console.log(`✅ All lines adjudicated for claim ${currentLine.claim_id}. Claim status: ${claimStatus}`);
    }

    console.log(`✅ Claim line ${auditAction}: Line ${currentLine.line_number} of claim ${currentLine.claim_id}`);
    console.log(`   Procedure: ${currentLine.procedure_code}`);
    console.log(`   Amount: R${currentLine.total_amount}`);
    if (action === 'approve') {
      console.log(`   Approved: R${approved_amount}`);
    }

    return NextResponse.json({
      success: true,
      line: updatedLine,
      all_lines_adjudicated: allAdjudicated,
      message: `Claim line ${auditAction} successfully`
    });

  } catch (error: any) {
    console.error('Error in claim line PATCH API:', error);
    
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
