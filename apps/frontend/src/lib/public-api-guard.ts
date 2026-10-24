import { createHmac } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function enforcePublicRateLimit(
  request: NextRequest,
  scope: 'ocr' | 'upload' | 'application' | 'lead' | 'member_login',
  perAddress: number,
  globalLimit: number,
  windowSeconds = 600,
): Promise<NextResponse | null> {
  const secret = process.env.RATE_LIMIT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  // The last forwarded address is less susceptible to a client-prepended value.
  // The global budget still applies if a proxy does not provide an address.
  const forwarded = request.headers.get('x-forwarded-for')?.split(',').pop()?.trim();
  const address = forwarded || request.headers.get('x-real-ip') || 'unknown';
  const subject = createHmac('sha256', secret).update(address).digest('hex');
  const { data, error } = await createServerSupabaseClient().rpc('consume_api_rate_limit', {
    p_scope: scope,
    p_subject_hash: subject,
    p_subject_limit: perAddress,
    p_global_limit: globalLimit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error('Rate limit unavailable:', error);
    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
  }
  return data === true ? null : NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    { status: 429, headers: { 'Retry-After': String(windowSeconds) } },
  );
}

export class RequestBodyError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function readBoundedJson(request: NextRequest, maxBytes: number): Promise<any> {
  const statedLength = Number(request.headers.get('content-length') || 0);
  if (statedLength > maxBytes) throw new RequestBodyError(413, 'Request is too large');
  if (!request.body) throw new RequestBodyError(400, 'Request body is required');
  const reader = request.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  let done = false;
  while (!done) {
    const chunk = await reader.read();
    if (chunk.done) { done = true; break; }
    const value = chunk.value;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new RequestBodyError(413, 'Request is too large');
    }
    chunks.push(Buffer.from(value));
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new RequestBodyError(400, 'Invalid JSON');
  }
}

export function parseOcrImage(value: unknown): string {
  if (typeof value !== 'string' || value.length > 14_000_000) {
    throw new RequestBodyError(413, 'Image is too large or invalid');
  }
  const match = /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[1].length % 4 !== 0) {
    throw new RequestBodyError(400, 'Only base64 JPEG, PNG, or WebP images are supported');
  }
  const image = Buffer.from(match[1], 'base64');
  if (!image.length || image.length > 10 * 1024 * 1024) {
    throw new RequestBodyError(413, 'Image is too large or empty');
  }
  const mime = value.slice(11, value.indexOf(';'));
  const valid = (mime === 'jpeg' && image.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) ||
    (mime === 'png' && image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
    (mime === 'webp' && image.toString('ascii', 0, 4) === 'RIFF' && image.toString('ascii', 8, 12) === 'WEBP');
  if (!valid) throw new RequestBodyError(415, 'Image content does not match its type');
  return match[1];
}
