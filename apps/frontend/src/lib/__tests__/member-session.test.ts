/** @jest-environment node */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getAuthenticatedMemberId, setMemberSession } from '../member-session';

jest.mock('@/lib/supabase-server', () => ({ createServerSupabaseClient: jest.fn() }));

const member = {
  id: '00000000-0000-4000-8000-000000000001',
  status: 'active',
  pin_hash: '$2a$10$example-hash-for-session-check',
};

function requestWithCookie(cookie: string) {
  return new NextRequest('http://localhost/api/member/session', {
    headers: { cookie: `kervox_member_session=${cookie}` },
  });
}

describe('member session', () => {
  const originalSecret = process.env.MEMBER_SESSION_SECRET;

  beforeEach(() => {
    process.env.MEMBER_SESSION_SECRET = 'local-test-member-session-secret-with-32-chars';
    const maybeSingle = jest.fn().mockResolvedValue({ data: member, error: null });
    const eq = jest.fn().mockReturnValue({ maybeSingle });
    const select = jest.fn().mockReturnValue({ eq });
    (createServerSupabaseClient as jest.Mock).mockReturnValue({ from: jest.fn().mockReturnValue({ select }) });
  });

  afterAll(() => {
    if (originalSecret === undefined) delete process.env.MEMBER_SESSION_SECRET;
    else process.env.MEMBER_SESSION_SECRET = originalSecret;
  });

  it('issues an HttpOnly cookie and authenticates only the signed member', async () => {
    const response = NextResponse.json({ ok: true });
    setMemberSession(response, member);
    const cookie = response.cookies.get('kervox_member_session');
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe('lax');
    expect(await getAuthenticatedMemberId(requestWithCookie(cookie!.value))).toBe(member.id);
  });

  it('rejects tampering and a PIN reset', async () => {
    const response = NextResponse.json({ ok: true });
    setMemberSession(response, member);
    const cookie = response.cookies.get('kervox_member_session')!.value;
    expect(await getAuthenticatedMemberId(requestWithCookie(`${cookie}x`))).toBeNull();

    const maybeSingle = jest.fn().mockResolvedValue({ data: { ...member, pin_hash: 'new-hash' }, error: null });
    const eq = jest.fn().mockReturnValue({ maybeSingle });
    (createServerSupabaseClient as jest.Mock).mockReturnValue({ from: () => ({ select: () => ({ eq }) }) });
    expect(await getAuthenticatedMemberId(requestWithCookie(cookie))).toBeNull();
  });
});
