/** @jest-environment node */

import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { enforcePublicRateLimit, parseOcrImage, readBoundedJson, RequestBodyError } from '../public-api-guard';

jest.mock('@/lib/supabase-server', () => ({ createServerSupabaseClient: jest.fn() }));

describe('public API guard', () => {
  const previousSecret = process.env.RATE_LIMIT_SECRET;

  beforeEach(() => {
    process.env.RATE_LIMIT_SECRET = 'test-secret';
    (createServerSupabaseClient as jest.Mock).mockReturnValue({
      rpc: jest.fn().mockResolvedValue({ data: true, error: null }),
    });
  });

  afterAll(() => {
    if (previousSecret === undefined) delete process.env.RATE_LIMIT_SECRET;
    else process.env.RATE_LIMIT_SECRET = previousSecret;
  });

  it('keeps IP addresses out of the database and rejects exhausted limits', async () => {
    const request = new NextRequest('http://localhost/api/ocr', {
      method: 'POST',
      headers: { 'x-forwarded-for': '198.51.100.1' },
    });
    expect(await enforcePublicRateLimit(request, 'ocr', 10, 500)).toBeNull();
    const rpc = (createServerSupabaseClient as jest.Mock).mock.results[0].value.rpc;
    const params = rpc.mock.calls[0][1];
    expect(params.p_subject_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(params)).not.toContain('198.51.100.1');

    rpc.mockResolvedValue({ data: false, error: null });
    const denied = await enforcePublicRateLimit(request, 'ocr', 10, 500);
    expect(denied?.status).toBe(429);
  });

  it('rejects a chunked JSON body that exceeds the limit', async () => {
    const request = new NextRequest('http://localhost/api/ocr', {
      method: 'POST',
      body: JSON.stringify({ data: 'x'.repeat(100) }),
    });
    await expect(readBoundedJson(request, 20)).rejects.toMatchObject({ status: 413 });
  });

  it('accepts a matching image signature and rejects a mismatched one', () => {
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4]);
    expect(parseOcrImage(`data:image/png;base64,${png.toString('base64')}`)).toBe(png.toString('base64'));
    expect(() => parseOcrImage(`data:image/jpeg;base64,${png.toString('base64')}`))
      .toThrow(RequestBodyError);
  });
});
