import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAnyRole } from '@/lib/auth-server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function GET(request: NextRequest) {
  try {
    await requireAnyRole(request, [
      'admin',
      'system_admin',
      'claims',
      'operations_manager',
      'call_centre_agent',
      'finance_manager',
    ]);

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    let query = supabaseAdmin
      .from('claims')
      .select('*')
      .order('submission_date', { ascending: false });

    if (status && status !== 'all') {
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
      return NextResponse.json(
        { error: 'Failed to fetch claims', details: error.message },
        { status: 500 }
      );
    }

    const providerIds = [...new Set((claims || []).map((claim) => claim.provider_id).filter(Boolean))];
    const memberIds = [...new Set((claims || []).map((claim) => claim.member_id).filter(Boolean))];

    const [providersResult, membersResult] = await Promise.all([
      providerIds.length > 0
        ? supabaseAdmin.from('providers').select('id, provider_number, name, practice_name, type, email, phone').in('id', providerIds)
        : Promise.resolve({ data: [] as any[], error: null }),
      memberIds.length > 0
        ? supabaseAdmin.from('members').select('id, member_number, first_name, last_name, email, mobile, plan_name').in('id', memberIds)
        : Promise.resolve({ data: [] as any[], error: null }),
    ]);

    const providersMap = new Map(providersResult.data?.map((provider) => [provider.id, provider]) || []);
    const membersMap = new Map(membersResult.data?.map((member) => [member.id, member]) || []);

    const enrichedClaims = (claims || []).map((claim) => ({
      ...claim,
      providers: claim.provider_id ? providersMap.get(claim.provider_id) || null : null,
      members: claim.member_id ? membersMap.get(claim.member_id) || null : null,
    }));

    const searchLower = search?.trim().toLowerCase() || '';
    const filteredClaims = searchLower
      ? enrichedClaims.filter((claim) => {
          const claimNumber = (claim.claim_number || '').toLowerCase();
          const memberNumber = (claim.members?.member_number || '').toLowerCase();
          const memberName = `${claim.members?.first_name || ''} ${claim.members?.last_name || ''}`.toLowerCase();
          const providerNumber = (claim.providers?.provider_number || '').toLowerCase();
          const providerName = (claim.providers?.name || '').toLowerCase();
          const practiceName = (claim.providers?.practice_name || '').toLowerCase();

          return (
            claimNumber.includes(searchLower) ||
            memberNumber.includes(searchLower) ||
            memberName.includes(searchLower) ||
            providerNumber.includes(searchLower) ||
            providerName.includes(searchLower) ||
            practiceName.includes(searchLower)
          );
        })
      : enrichedClaims;

    const stats = {
      total: filteredClaims.length || 0,
      pending: filteredClaims.filter((c) => c.status === 'pending').length || 0,
      pended: filteredClaims.filter((c) => c.status === 'pended').length || 0,
      approved: filteredClaims.filter((c) => c.status === 'approved').length || 0,
      paid: filteredClaims.filter((c) => c.status === 'paid').length || 0,
      rejected: filteredClaims.filter((c) => c.status === 'rejected').length || 0,
      high_value: filteredClaims.filter((c) => parseFloat(c.claimed_amount) > 50000).length || 0,
      total_claimed: filteredClaims.reduce((sum, c) => sum + parseFloat(c.claimed_amount || 0), 0) || 0,
      total_approved: filteredClaims.reduce((sum, c) => sum + parseFloat(c.approved_amount || 0), 0) || 0,
    };

    const completedClaims = filteredClaims.filter((c) => c.processing_time_hours !== null) || [];
    const avgProcessingTime =
      completedClaims.length > 0
        ? completedClaims.reduce((sum, c) => sum + parseFloat(c.processing_time_hours || 0), 0) / completedClaims.length
        : 0;

    return NextResponse.json({
      claims: filteredClaims,
      stats: {
        ...stats,
        avg_processing_time: Math.round(avgProcessingTime * 10) / 10,
      },
    });
  } catch (error: any) {
    console.error('Error in claims API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
