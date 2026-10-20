import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAnyRole } from '@/lib/auth-server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAnyRole(request, [
      'claims',
      'admin',
      'system_admin',
      'operations_manager',
      'finance_manager',
      'call_centre_agent',
    ]);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const claimId = params.id;

    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .select('*')
      .eq('id', claimId)
      .single();

    if (claimError || !claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    const [{ data: member }, { data: provider }, { data: claimDocuments }, { data: auditTrail }] = await Promise.all([
      claim.member_id
        ? supabase
            .from('members')
            .select('member_number, first_name, last_name, id_number, email, mobile, plan_name, broker_code')
            .eq('id', claim.member_id)
            .single()
        : Promise.resolve({ data: null as any }),
      claim.provider_id
        ? supabase
            .from('providers')
            .select('practice_name, type, prno, pcns_practice_number, email, phone')
            .eq('id', claim.provider_id)
            .single()
        : Promise.resolve({ data: null as any }),
      supabase
        .from('claim_documents')
        .select('id, document_type, document_url, uploaded_at')
        .eq('claim_id', claimId)
        .order('uploaded_at', { ascending: false }),
      supabase
        .from('claim_audit_trail')
        .select('*')
        .eq('claim_id', claimId)
        .order('created_at', { ascending: false }),
    ]);

    const { data: claimLines } = await supabase
      .from('claim_lines')
      .select('*')
      .eq('claim_id', claimId)
      .order('line_number', { ascending: true });

    let paymentInfo = null;
    if (claim.status === 'paid' || claim.status === 'approved') {
      const { data: payment } = await supabase
        .from('claim_payments')
        .select(`
          *,
          payment_batches (
            batch_number,
            batch_date,
            status
          )
        `)
        .eq('claim_id', claimId)
        .single();

      paymentInfo = payment;
    }

    const benefitType = claim.benefit_type || claim.claim_type;
    const { data: benefitUsage } = benefitType
      ? await supabase
          .from('benefit_usage')
          .select('*')
          .eq('member_id', claim.member_id)
          .eq('benefit_type', benefitType)
          .eq('year', new Date(claim.service_date).getFullYear())
          .single()
      : { data: null as any };

    const normalizedClaim = {
      ...claim,
      benefit_type: benefitType,
      claim_status: claim.status,
      pend_reason: claim.pended_reason,
      approved_date: claim.approved_at,
      members: member || null,
      providers: provider
        ? {
            practice_name: provider.practice_name,
            provider_type: provider.type,
            practice_number: provider.pcns_practice_number || provider.prno,
            email: provider.email,
            phone: provider.phone,
          }
        : null,
      claim_documents: claimDocuments || [],
    };

    return NextResponse.json({
      claim: normalizedClaim,
      claimLines: claimLines || [],
      auditTrail: auditTrail || [],
      audit_trail: auditTrail || [],
      documents: claimDocuments || [],
      paymentInfo,
      benefitUsage,
    });
  } catch (error) {
    console.error('Error fetching claim details:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch claim details',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
