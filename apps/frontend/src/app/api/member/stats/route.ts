import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedMemberId } from '@/lib/member-session';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const memberId = await getAuthenticatedMemberId(request);
    if (!memberId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get claims stats
    const { data: claims } = await supabaseAdmin
      .from('claims')
      .select('status, approved_amount')
      .eq('member_id', memberId);

    const activeClaims = claims?.filter(c => c.status === 'pending' || c.status === 'pended').length || 0;
    const pendingClaims = claims?.filter(c => c.status === 'pending').length || 0;
    
    const paidClaims = claims?.filter(c => c.status === 'paid') || [];
    const totalClaimsPaid = paidClaims.reduce((sum, c) => sum + Number(c.approved_amount || 0), 0);

    // Get last payment
    const { data: lastPayment } = await supabaseAdmin
      .from('payment_history')
      .select('payment_date, amount')
      .eq('member_id', memberId)
      .eq('status', 'success')
      .order('payment_date', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      activeClaims,
      pendingClaims,
      totalClaimsPaid,
      lastPaymentDate: lastPayment?.payment_date || null,
      lastPaymentAmount: lastPayment?.amount || null,
    });
  } catch (error) {
    console.error('Error fetching member stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch member stats' },
      { status: 500 }
    );
  }
}
