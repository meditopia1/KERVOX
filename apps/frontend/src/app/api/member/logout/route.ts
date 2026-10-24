import { NextResponse } from 'next/server';
import { clearMemberSession } from '@/lib/member-session';

export async function POST() {
  const response = NextResponse.json({ success: true });
  clearMemberSession(response);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
