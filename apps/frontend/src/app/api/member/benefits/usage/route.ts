import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedMemberId } from '@/lib/member-session';
import { getAuthenticatedUser } from '@/lib/auth-server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const isUuid = (value: unknown) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const isValidYear = (value: unknown) => Number.isInteger(value) && Number(value) >= 2000 && Number(value) <= 2100;
const isNonnegativeNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1_000_000_000;
const isNonnegativeCount = (value: unknown) => Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 1_000_000;

/**
 * GET /api/member/benefits/usage
 * 
 * Fetch benefit usage for a member for the current year
 * 
 * Query Parameters:
 * - member_id (required): Member ID
 * - year (optional): Year to fetch usage for (defaults to current year)
 * - benefit_type (optional): Specific benefit type to fetch
 */
export async function GET(request: NextRequest) {
  try {
    const memberId = await getAuthenticatedMemberId(request);
    if (!memberId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    if (searchParams.get('member_id') && searchParams.get('member_id') !== memberId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const year = searchParams.get('year') || new Date().getFullYear().toString();
    const benefitType = searchParams.get('benefit_type');
    if (!/^20\d{2}$/.test(year)) return NextResponse.json({ error: 'Invalid year' }, { status: 400 });

    // Build query
    let query = supabaseAdmin
      .from('benefit_usage')
      .select('*')
      .eq('member_id', memberId)
      .eq('year', parseInt(year));

    if (benefitType) {
      query = query.eq('benefit_type', benefitType);
    }

    const { data, error } = await query.order('benefit_type');

    if (error) {
      console.error('Error fetching benefit usage:', error);
      return NextResponse.json(
        { error: 'Failed to fetch benefit usage' },
        { status: 500 }
      );
    }

    return NextResponse.json({ usage: data || [] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/member/benefits/usage
 * 
 * Initialize or update benefit usage for a member
 * 
 * Body:
 * - member_id (required): Member ID
 * - benefit_type (required): Type of benefit
 * - year (optional): Year (defaults to current year)
 * - total_limit_amount (optional): Annual limit amount
 * - total_limit_count (optional): Annual limit count
 * - used_amount (optional): Amount used (for updates)
 * - used_count (optional): Count used (for updates)
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!user.roles.some(role => ['claims', 'admin', 'system_admin'].includes(role))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await request.json();
    const {
      member_id,
      benefit_type,
      year = new Date().getFullYear(),
      total_limit_amount,
      total_limit_count,
      used_amount = 0,
      used_count = 0,
    } = body;

    if (!isUuid(member_id) || typeof benefit_type !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(benefit_type) ||
        !isValidYear(year) ||
        (total_limit_amount !== undefined && !isNonnegativeNumber(total_limit_amount)) ||
        (total_limit_count !== undefined && !isNonnegativeCount(total_limit_count)) ||
        !isNonnegativeNumber(used_amount) || !isNonnegativeCount(used_count)) {
      return NextResponse.json(
        { error: 'Invalid benefit usage details' },
        { status: 400 }
      );
    }

    // Check if record exists
    const { data: existing } = await supabaseAdmin
      .from('benefit_usage')
      .select('*')
      .eq('member_id', member_id)
      .eq('benefit_type', benefit_type)
      .eq('year', year)
      .single();

    if (existing) {
      // Only explicitly supplied fields may alter an existing record.
      const updates: Record<string, number | string> = { updated_at: new Date().toISOString() };
      for (const field of ['total_limit_amount', 'total_limit_count', 'used_amount', 'used_count'] as const) {
        if (Object.prototype.hasOwnProperty.call(body, field)) updates[field] = body[field];
      }
      const { data, error } = await supabaseAdmin
        .from('benefit_usage')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating benefit usage:', error);
        return NextResponse.json(
          { error: 'Failed to update benefit usage' },
          { status: 500 }
        );
      }

      return NextResponse.json({ usage: data });
    } else {
      // Create new record
      const { data, error } = await supabaseAdmin
        .from('benefit_usage')
        .insert({
          member_id,
          benefit_type,
          year,
          total_limit_amount,
          total_limit_count,
          used_amount,
          used_count,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating benefit usage:', error);
        return NextResponse.json(
          { error: 'Failed to create benefit usage' },
          { status: 500 }
        );
      }

      return NextResponse.json({ usage: data }, { status: 201 });
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/member/benefits/usage
 * 
 * Increment benefit usage when a claim is approved
 * 
 * Body:
 * - member_id (required): Member ID
 * - benefit_type (required): Type of benefit
 * - amount (required): Amount to add to used_amount
 * - year (optional): Year (defaults to current year)
 */
export async function PATCH(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!user.roles.some(role => ['claims', 'admin', 'system_admin'].includes(role))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await request.json();
    const {
      member_id,
      benefit_type,
      amount,
      year = new Date().getFullYear(),
    } = body;

    if (!isUuid(member_id) || typeof benefit_type !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(benefit_type) ||
        !isValidYear(year) || !isNonnegativeNumber(amount) || amount === 0) {
      return NextResponse.json(
        { error: 'Invalid benefit usage increment' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin.rpc('increment_benefit_usage', {
      p_member_id: member_id,
      p_benefit_type: benefit_type,
      p_year: year,
      p_amount: amount,
    });

    if (error) {
      console.error('Error incrementing benefit usage:', error);
      return NextResponse.json(
        { error: 'Failed to increment benefit usage' },
        { status: 500 }
      );
    }

    if (!data) return NextResponse.json({ error: 'Benefit usage record not found' }, { status: 404 });
    return NextResponse.json({ usage: data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
