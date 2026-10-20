import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateEFTFile, generatePaymentReference, validatePaymentBatch } from '@/lib/payment-processing';
import { createAuthenticatedSupabaseClient, requireAnyRole } from '@/lib/auth-server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// GET - Fetch batch details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAnyRole(request, ['finance_manager', 'admin', 'system_admin']);

    const supabase = createAuthenticatedSupabaseClient(request);
    const batchId = params.id;

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
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAnyRole(request, ['finance_manager', 'admin', 'system_admin']);
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await request.json();
    const batchId = params.id;

    const {
      action // 'approve', 'process', 'complete', 'cancel'
    } = body;

    // Fetch current batch
    const { data: batch, error: batchError } = await supabase
      .from('payment_batches')
      .select(`
        *,
        payments:claim_payments (*)
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
      const fileName = `${batch.batch_number}.txt`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('eft-files')
        .upload(`batches/${fileName}`, eftContent, {
          contentType: 'text/plain',
          upsert: true
        });

      if (uploadError) {
        console.error('Error uploading EFT file:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('eft-files')
        .getPublicUrl(`batches/${fileName}`);

      updateData = {
        ...updateData,
        status: 'processing',
        eft_file_generated: true,
        eft_file_url: urlData.publicUrl,
        eft_file_generated_at: now,
        processed_by: user.id,
        processed_at: now
      };

      // Update payment statuses to processing
      await supabase
        .from('claim_payments')
        .update({ payment_status: 'processing', updated_at: now })
        .eq('payment_batch_id', batchId);

    } else if (action === 'complete') {
      // Validate batch can be completed
      if (batch.status !== 'processing') {
        return NextResponse.json(
          { error: `Cannot complete batch with status: ${batch.status}` },
          { status: 400 }
        );
      }

      const paymentDate = new Date().toISOString().split('T')[0];

      updateData = {
        ...updateData,
        status: 'completed',
        completed_at: now
      };

      // Update all payments to paid
      const paymentUpdates = batch.payments.map(async (payment: any) => {
        const paymentRef = generatePaymentReference(payment.claim.claim_number);
        
        // Update payment record
        await supabase
          .from('claim_payments')
          .update({
            payment_status: 'paid',
            payment_date: paymentDate,
            payment_reference: paymentRef,
            updated_at: now
          })
          .eq('id', payment.id);

        // Update claim record
        await supabase
          .from('claims')
          .update({
            paid_date: paymentDate,
            payment_reference: paymentRef,
            updated_at: now
          })
          .eq('id', payment.claim_id);
      });

      await Promise.all(paymentUpdates);

    } else if (action === 'cancel') {
      // Validate batch can be cancelled
      if (!['draft', 'approved'].includes(batch.status)) {
        return NextResponse.json(
          { error: `Cannot cancel batch with status: ${batch.status}` },
          { status: 400 }
        );
      }

      updateData = {
        ...updateData,
        status: 'cancelled'
      };

      // Update all payments to cancelled
      await supabase
        .from('claim_payments')
        .update({ payment_status: 'cancelled', updated_at: now })
        .eq('payment_batch_id', batchId);

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
      .select()
      .single();

    if (updateError) {
      console.error('Error updating batch:', updateError);
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      batch: updatedBatch,
      message: `Batch ${action}d successfully`
    });

  } catch (error) {
    console.error('Error updating batch:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update batch', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// DELETE - Disabled for security
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return NextResponse.json(
    { 
      error: 'Payment batch deletion is disabled. Use cancel/void workflow instead.',
      code: 'DELETE_DISABLED'
    },
    { status: 403 }
  );
}
