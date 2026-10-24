import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateEFTFile, validatePaymentBatch } from '@/lib/payment-processing';
import { createAuthenticatedSupabaseClient, requireAnyRole } from '@/lib/auth-server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// GET - Fetch batch details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAnyRole(request, ['finance_manager', 'admin', 'system_admin']);

    const supabase = createAuthenticatedSupabaseClient(request);
    const batchId = (await params).id;

    // Fetch batch with payments
    const { data: batch, error: batchError } = await supabase
      .from('payment_batches')
      .select(`
        *,
        payments:claim_payments (
          *,
          claim:claims (
            claim_number,
            service_date,
            benefit_type
          )
        )
      `)
      .eq('id', batchId)
      .single();

    if (batchError || !batch) {
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ batch });

  } catch (error) {
    console.error('Error fetching batch:', error);
    return NextResponse.json(
      { error: 'Failed to fetch batch' },
      { status: 500 }
    );
  }
}

// PATCH - Update batch status (approve, process, complete)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAnyRole(request, ['finance_manager', 'admin', 'system_admin']);
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await request.json();
    const batchId = (await params).id;

    const {
      action // 'approve', 'process', 'complete', 'cancel'
    } = body;

    // Fetch current batch
    const { data: batch, error: batchError } = await supabase
      .from('payment_batches')
      .select(`
        *,
        payments:claim_payments (
          *,
          claim:claims (claim_number)
        )
      `)
      .eq('id', batchId)
      .single();

    if (batchError || !batch) {
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    let updateData: any = { updated_at: now };

    // Handle different actions
    if (action === 'approve') {
      // Validate batch can be approved
      if (batch.status !== 'draft') {
        return NextResponse.json(
          { error: `Cannot approve batch with status: ${batch.status}` },
          { status: 400 }
        );
      }

      // Validate batch data
      const validation = validatePaymentBatch({
        ...batch,
        payments: batch.payments
      });

      if (!validation.valid) {
        return NextResponse.json({
          error: 'Batch validation failed',
          validation_errors: validation.errors
        }, { status: 400 });
      }

      updateData = {
        ...updateData,
        status: 'approved',
        approved_by: user.id,
        approved_at: now
      };

    } else if (action === 'process') {
      // Validate batch can be processed
      if (batch.status !== 'approved') {
        return NextResponse.json(
          { error: `Cannot process batch with status: ${batch.status}` },
          { status: 400 }
        );
      }

      // Generate EFT file
      const eftContent = generateEFTFile({
        ...batch,
        payments: batch.payments
      });

      // Upload EFT file to Supabase Storage
      const safeBatchNumber = String(batch.batch_number || '').replace(/[^A-Za-z0-9_-]/g, '');
      if (!safeBatchNumber || safeBatchNumber !== batch.batch_number) {
        return NextResponse.json({ error: 'Invalid batch number' }, { status: 400 });
      }
      const fileName = `${safeBatchNumber}.txt`;
      const eftPath = `batches/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('eft-files')
        .upload(eftPath, eftContent, {
          contentType: 'text/plain',
          upsert: true
        });

      if (uploadError) {
        console.error('Error uploading EFT file:', uploadError);
        throw uploadError;
      }

      const { data: processedBatch, error: processError } = await supabase.rpc(
        'process_payment_batch',
        { p_batch_id: batchId, p_user_id: user.id, p_eft_path: eftPath }
      );
      if (processError) {
        console.error('Atomic payment batch processing failed:', processError);
        return NextResponse.json({ error: 'Could not process batch' }, { status: 409 });
      }
      return NextResponse.json({ success: true, batch: processedBatch, message: 'Batch processed successfully' });

    } else if (action === 'complete') {
      // Validate batch can be completed
      if (batch.status !== 'processing') {
        return NextResponse.json(
          { error: `Cannot complete batch with status: ${batch.status}` },
          { status: 400 }
        );
      }

      const { data: completedBatch, error: completionError } = await supabase.rpc(
        'complete_payment_batch', { p_batch_id: batchId }
      );
      if (completionError) {
        console.error('Atomic payment batch completion failed:', completionError);
        return NextResponse.json(
          { error: 'Could not complete batch; no partial completion was saved' },
          { status: completionError.code === 'P0001' ? 409 : 500 }
        );
      }
      return NextResponse.json({ success: true, batch: completedBatch, message: 'Batch completed successfully' });

    } else if (action === 'cancel') {
      // Validate batch can be cancelled
      if (!['draft', 'approved'].includes(batch.status)) {
        return NextResponse.json(
          { error: `Cannot cancel batch with status: ${batch.status}` },
          { status: 400 }
        );
      }

      const { data: cancelledBatch, error: cancellationError } = await supabase.rpc(
        'cancel_payment_batch', { p_batch_id: batchId }
      );
      if (cancellationError) {
        console.error('Atomic payment batch cancellation failed:', cancellationError);
        return NextResponse.json({ error: 'Could not cancel batch' }, { status: 409 });
      }
      return NextResponse.json({ success: true, batch: cancelledBatch, message: 'Batch cancelled successfully' });

    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    // Update batch
    const { data: updatedBatch, error: updateError } = await supabase
      .from('payment_batches')
      .update(updateData)
      .eq('id', batchId)
      .eq('status', batch.status)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error('Error updating batch:', updateError);
      throw updateError;
    }
    if (!updatedBatch) return NextResponse.json({ error: 'Batch was changed by another request' }, { status: 409 });

    return NextResponse.json({
      success: true,
      batch: updatedBatch,
      message: `Batch ${action}d successfully`
    });

  } catch (error) {
    console.error('Error updating batch:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update batch'
      },
      { status: 500 }
    );
  }
}

// DELETE - Disabled for security
export async function DELETE(
  _request: NextRequest
) {
  return NextResponse.json(
    { 
      error: 'Payment batch deletion is disabled. Use cancel/void workflow instead.',
      code: 'DELETE_DISABLED'
    },
    { status: 403 }
  );
}
