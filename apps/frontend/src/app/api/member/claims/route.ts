import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// GET - Fetch member's claims
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { searchParams } = new URL(request.url);
    
    // TODO: Get member_id from authenticated session
    const memberId = searchParams.get('member_id');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;

    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID required' },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from('claims')
      .select('*')
      .eq('member_id', memberId)
      .order('submission_date', { ascending: false })
      .limit(limit);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (dateFrom) {
      query = query.gte('service_date', dateFrom);
    }

    if (dateTo) {
      query = query.lte('service_date', dateTo);
    }

    const { data: claims, error } = await query;

    if (error) {
      console.error('Error fetching claims:', error);
      throw error;
    }

    const providerIds = [...new Set((claims || []).map((claim) => claim.provider_id).filter(Boolean))];
    const { data: providers } = providerIds.length > 0
      ? await supabase
          .from('providers')
          .select('id, practice_name, type')
          .in('id', providerIds)
      : { data: [] as any[] };

    const providersMap = new Map((providers || []).map((provider: any) => [provider.id, provider]));

    const normalizedClaims = (claims || []).map((claim: any) => ({
      ...claim,
      benefit_type: claim.benefit_type || claim.claim_type,
      claim_status: claim.status,
      pend_reason: claim.pended_reason,
      approved_date: claim.approved_at,
      providers: claim.provider_id
        ? (() => {
            const provider = providersMap.get(claim.provider_id);
            return provider
              ? {
                  practice_name: provider.practice_name,
                  provider_type: provider.type,
                }
              : null;
          })()
        : null,
    }));

    // Calculate statistics
    const stats = {
      total: normalizedClaims.length || 0,
      submitted: normalizedClaims.filter(c => c.claim_status === 'submitted').length || 0,
      pending: normalizedClaims.filter(c => c.claim_status === 'pending').length || 0,
      approved: normalizedClaims.filter(c => c.claim_status === 'approved').length || 0,
      paid: normalizedClaims.filter(c => c.claim_status === 'paid').length || 0,
      rejected: normalizedClaims.filter(c => c.claim_status === 'rejected').length || 0,
      pended: normalizedClaims.filter(c => c.claim_status === 'pended').length || 0,
      total_claimed: normalizedClaims.reduce((sum, c) => sum + parseFloat(c.claimed_amount || '0'), 0) || 0,
      total_approved: normalizedClaims.reduce((sum, c) => sum + parseFloat(c.approved_amount || '0'), 0) || 0,
      total_paid: normalizedClaims.filter(c => c.claim_status === 'paid')
        .reduce((sum, c) => sum + parseFloat(c.approved_amount || '0'), 0) || 0
    };

    return NextResponse.json({
      claims: normalizedClaims,
      stats
    });

  } catch (error) {
    console.error('Error in member claims API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch claims',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
