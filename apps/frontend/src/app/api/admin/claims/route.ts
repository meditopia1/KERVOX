import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAuthenticatedSupabaseClient, requireAnyRole } from '@/lib/auth-server';

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

export async function GET(request: NextRequest) {
  try {
    await requireAnyRole(request, ['admin', 'system_admin', 'claims', 'operations_manager', 'call_centre_agent']);
    const supabase = createAuthenticatedSupabaseClient(request);

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    // Build the base claims query first, then enrich related records separately.
    let query = supabase
      .from('claims')
      .select('*')
      .order('submission_date', { ascending: false });

    // Apply filters
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
        ? supabase.from('providers').select('id, provider_number, name, practice_name, type, email, phone').in('id', providerIds)
        : Promise.resolve({ data: [] as any[], error: null }),
      memberIds.length > 0
        ? supabase.from('members').select('id, member_number, first_name, last_name, email, mobile, plan_name').in('id', memberIds)
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

    // Calculate statistics
    const stats = {
      total: filteredClaims.length || 0,
      pending: filteredClaims.filter(c => c.status === 'pending').length || 0,
      pended: filteredClaims.filter(c => c.status === 'pended').length || 0,
      approved: filteredClaims.filter(c => c.status === 'approved').length || 0,
      paid: filteredClaims.filter(c => c.status === 'paid').length || 0,
      rejected: filteredClaims.filter(c => c.status === 'rejected').length || 0,
      high_value: filteredClaims.filter(c => parseFloat(c.claimed_amount) > 50000).length || 0,
      total_claimed: filteredClaims.reduce((sum, c) => sum + parseFloat(c.claimed_amount || 0), 0) || 0,
      total_approved: filteredClaims.reduce((sum, c) => sum + parseFloat(c.approved_amount || 0), 0) || 0,
    };

    // Calculate average processing time for completed claims
    const completedClaims = filteredClaims.filter(c => c.processing_time_hours !== null) || [];
    const avgProcessingTime = completedClaims.length > 0
      ? completedClaims.reduce((sum, c) => sum + parseFloat(c.processing_time_hours || 0), 0) / completedClaims.length
      : 0;

    return NextResponse.json({
      claims: filteredClaims,
      stats: {
        ...stats,
        avg_processing_time: Math.round(avgProcessingTime * 10) / 10
      }
    });

  } catch (error: any) {
    console.error('Error in claims API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAnyRole(request, ['admin', 'system_admin', 'claims', 'operations_manager', 'call_centre_agent']);
    const body = await request.json();

    // Validate required fields
    const requiredFields = ['member_id', 'provider_id', 'service_date', 'claimed_amount', 'claim_type'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Generate claim number (format: CLM-YYYYMMDD-XXX)
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    
    // Get count of claims today to generate sequence number
    const { data: todayClaims } = await supabaseAdmin
      .from('claims')
      .select('claim_number')
      .like('claim_number', `CLM-${dateStr}-%`);
    
    const sequence = String((todayClaims?.length || 0) + 1).padStart(3, '0');
    const claimNumber = `CLM-${dateStr}-${sequence}`;

    // Create claim
    const { data: claim, error } = await supabaseAdmin
      .from('claims')
      .insert({
        claim_number: claimNumber,
        member_id: body.member_id,
        provider_id: body.provider_id,
        service_date: body.service_date,
        claimed_amount: body.claimed_amount,
        claim_type: body.claim_type,
        benefit_type: body.benefit_type,
        icd10_codes: body.icd10_codes || [],
        tariff_codes: body.tariff_codes || [],
        pre_auth_number: body.pre_auth_number,
        pre_auth_required: body.pre_auth_required || false,
        is_pmb: body.is_pmb || false,
        claim_source: body.claim_source || 'provider',
        submission_method: body.submission_method || 'portal',
        document_urls: body.document_urls || [],
        claim_data: body.claim_data || {},
        status: 'pending',
        submission_date: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating claim:', error);
      return NextResponse.json(
        { error: 'Failed to create claim', details: error.message },
        { status: 500 }
      );
    }

    // Create audit trail entry
    await supabaseAdmin
      .from('claim_audit_trail')
      .insert({
        claim_id: claim.id,
        action: 'submitted',
        new_status: 'pending',
        notes: 'Claim submitted via portal'
      });

    return NextResponse.json({
      success: true,
      claim,
      message: 'Claim created successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating claim:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
