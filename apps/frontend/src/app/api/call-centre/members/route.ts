import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { requireAnyRole } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAnyRole(request, ['call_centre_agent', 'operations_manager', 'admin', 'system_admin']);

    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';

    let query = supabase
      .from('members')
      .select(`
        id,
        member_number,
        first_name,
        last_name,
        id_number,
        email,
        mobile,
        status,
        plan_name,
        monthly_premium,
        start_date
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (search) {
      const cleanSearch = search.replace(/\s+/g, '');
      query = query.or(
        `member_number.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,id_number.ilike.%${cleanSearch}%,mobile.ilike.%${search}%`
      );
    }

    const { data: members, error } = await query;
    if (error) throw error;

    const transformed = (members || []).map((member) => ({
      id: member.id,
      memberNumber: member.member_number,
      firstName: member.first_name,
      lastName: member.last_name,
      idNumber: member.id_number,
      email: member.email,
      phone: member.mobile,
      status: member.status,
      product: member.plan_name,
      monthlyPremium: Number(member.monthly_premium || 0),
      joinDate: member.start_date,
      policyNumber: member.member_number,
    }));

    return NextResponse.json({
      members: transformed,
      count: transformed.length,
    });
  } catch (error) {
    console.error('Failed to fetch call centre members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
