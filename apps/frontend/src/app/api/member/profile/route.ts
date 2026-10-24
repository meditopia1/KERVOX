import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedMemberId } from '@/lib/member-session';

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
    const memberId = await getAuthenticatedMemberId(request);
    if (!memberId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const searchParams = request.nextUrl.searchParams;
    if (searchParams.get('id') && searchParams.get('id') !== memberId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch member profile
    const { data: member, error } = await supabaseAdmin
      .from('members')
      .select('*')
      .eq('id', memberId)
      .single();

    if (error || !member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    // Fetch dependants
    const { data: dependants } = await supabaseAdmin
      .from('member_dependants')
      .select('*')
      .eq('member_id', memberId)
      .order('dependant_code', { ascending: true });

    // Fetch benefit usage for current year
    const currentYear = new Date().getFullYear();
    const { data: benefitUsage } = await supabaseAdmin
      .from('benefit_usage')
      .select('*')
      .eq('member_id', memberId)
      .eq('year', currentYear);

    // Fetch recent claims
    const { data: recentClaims } = await supabaseAdmin
      .from('claims')
      .select('id, claim_number, service_date, claim_type, claimed_amount, approved_amount, status')
      .eq('member_id', memberId)
      .order('submission_date', { ascending: false })
      .limit(5);

    // Remove sensitive fields
    const memberData = Object.fromEntries(
      Object.entries(member).filter(([key]) => key !== 'pin_code' && key !== 'pin_hash')
    );

    return NextResponse.json({
      member: memberData,
      dependants: dependants || [],
      benefit_usage: benefitUsage || [],
      recent_claims: recentClaims || []
    });

  } catch (error: any) {
    console.error('Error fetching member profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
