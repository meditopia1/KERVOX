import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const COOKIE_NAME = 'kervox_member_session';
const SESSION_SECONDS = 4 * 60 * 60;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function signingKey(): Buffer {
  // Derive a separate signing key from an existing server-only secret so a
  // deployment does not silently accept unsigned member sessions.
  const secret = process.env.MEMBER_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || secret.length < 32) {
    throw new Error('Member session signing secret is not configured');
  }
  return createHmac('sha256', secret).update('kervox/member-session/v1').digest();
}

function pinVersion(pinHash: string): string {
  return createHash('sha256').update(pinHash).digest('base64url').slice(0, 22);
}

function sign(payload: string): string {
  return createHmac('sha256', signingKey()).update(payload).digest('base64url');
}

export function setMemberSession(response: NextResponse, member: { id: string; pin_hash: string }): void {
  if (!UUID_PATTERN.test(member.id) || !member.pin_hash) {
    throw new Error('Cannot issue a session for this member');
  }

  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = Buffer.from(`1:${member.id}:${expires}:${pinVersion(member.pin_hash)}`).toString('base64url');
  response.cookies.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_SECONDS,
  });
}

export function clearMemberSession(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

function readSession(request: NextRequest): { memberId: string; version: string } | null {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token || token.length > 512) return null;

  const parts = token.split('.');
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[A-Za-z0-9_-]+$/.test(parts[1])) {
    return null;
  }

  const expected = Buffer.from(sign(parts[0]), 'base64url');
  const actual = Buffer.from(parts[1], 'base64url');
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  const fields = Buffer.from(parts[0], 'base64url').toString('utf8').split(':');
  if (fields.length !== 4 || fields[0] !== '1' || !UUID_PATTERN.test(fields[1])) return null;

  const expires = Number(fields[2]);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(expires) || expires <= now || expires > now + SESSION_SECONDS) return null;
  if (!/^[A-Za-z0-9_-]{22}$/.test(fields[3])) return null;

  return { memberId: fields[1], version: fields[3] };
}

export async function getAuthenticatedMemberId(request: NextRequest): Promise<string | null> {
  const session = readSession(request);
  if (!session) return null;

  // Re-check the account on each request. Deactivation or a PIN reset revokes
  // an otherwise unexpired cookie without trusting browser-held member data.
  const { data: member, error } = await createServerSupabaseClient()
    .from('members')
    .select('id, status, pin_hash')
    .eq('id', session.memberId)
    .maybeSingle();

  if (error || !member || member.status !== 'active' || !member.pin_hash) return null;
  return pinVersion(member.pin_hash) === session.version ? member.id : null;
}
