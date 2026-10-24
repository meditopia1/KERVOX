import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedMemberId } from '@/lib/member-session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const memberId = await getAuthenticatedMemberId(request);
  if (!memberId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true, member_id: memberId }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
