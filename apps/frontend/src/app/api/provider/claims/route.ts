import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireRole } from '@/lib/auth-server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// GET - Fetch provider's claims
export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(request, 'provider');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { searchParams } = new URL(request.url);
    
    const providerId = user.providerId;
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const search = searchParams.get('search'); // For claim number, member number, patient name
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;

    if (!providerId) {
      return NextResponse.json(
        { error: 'Provider ID required' },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from('claims')
      .select('*')
      .eq('provider_id', providerId)
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

    // Note: Search filtering will be done in-memory after fetch
    // For production, consider using PostgreSQL full-text search

    const { data: claims, error } = await query;

    if (error) {
      console.error('Error fetching claims:', error);
      throw error;
    }

    const memberIds = [...new Set((claims || []).map((claim) => claim.member_id).filter(Boolean))];
    const { data: members } = memberIds.length > 0
      ? await supabase
          .from('members')
          .select('id, member_number, first_name, last_name')
          .in('id', memberIds)
      : { data: [] as any[] };

    const membersMap = new Map((members || []).map((member: any) => [member.id, member]));

    const normalizedClaims = (claims || []).map((claim: any) => ({
      ...claim,
      benefit_type: claim.benefit_type || claim.claim_type,
      claim_status: claim.status,
      pend_reason: claim.pended_reason,
      approved_date: claim.approved_at,
      members: claim.member_id ? membersMap.get(claim.member_id) || null : null,
    }));

    // Apply search filter if provided
    let filteredClaims = normalizedClaims;
    if (search && search.trim() !== '') {
      const searchLower = search.toLowerCase();
      filteredClaims = filteredClaims.filter(claim => {
        const claimNumber = claim.claim_number?.toLowerCase() || '';
        const member = Array.isArray(claim.members) ? claim.members[0] : claim.members;
        const memberNumber = member?.member_number?.toLowerCase() || '';
        const patientName = `${member?.first_name || ''} ${member?.last_name || ''}`.toLowerCase();
        
        return claimNumber.includes(searchLower) ||
               memberNumber.includes(searchLower) ||
               patientName.includes(searchLower);
      });
    }

    // Calculate statistics
    const stats = {
      total: filteredClaims.length,
      submitted: filteredClaims.filter(c => c.claim_status === 'submitted').length,
      pending: filteredClaims.filter(c => c.claim_status === 'pending').length,
      approved: filteredClaims.filter(c => c.claim_status === 'approved').length,
      paid: filteredClaims.filter(c => c.claim_status === 'paid').length,
      rejected: filteredClaims.filter(c => c.claim_status === 'rejected').length,
      pended: filteredClaims.filter(c => c.claim_status === 'pended').length,
      total_claimed: filteredClaims.reduce((sum, c) => sum + parseFloat(c.claimed_amount || '0'), 0),
      total_approved: filteredClaims.reduce((sum, c) => sum + parseFloat(c.approved_amount || '0'), 0),
      total_paid: filteredClaims.filter(c => c.claim_status === 'paid')
        .reduce((sum, c) => sum + parseFloat(c.approved_amount || '0'), 0)
    };

    const dashboardStats = {
      ...stats,
      totalClaims: stats.total,
      pendingClaims: stats.pending,
      approvedClaims: stats.approved,
      totalApproved: stats.total_approved,
      totalPending: filteredClaims
        .filter((c) => c.claim_status === 'pending' || c.claim_status === 'submitted' || c.claim_status === 'pended')
        .reduce((sum, c) => sum + parseFloat(c.claimed_amount || '0'), 0)
    };

    return NextResponse.json({
      claims: filteredClaims,
      stats: dashboardStats
    });

  } catch (error: any) {
    console.error('Error in provider claims API:', error);

    if (error.message.includes('Access denied') || error.message.includes('Authentication required')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Access denied') ? 403 : 401 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to fetch claims',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
