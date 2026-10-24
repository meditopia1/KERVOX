/** @jest-environment node */

import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/auth-server';
import type { NextRequest } from 'next/server';
import { POST } from '../route';

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));
jest.mock('@/lib/auth-server', () => ({ getAuthenticatedUser: jest.fn() }));

describe('benefit validation access', () => {
  const auth = getAuthenticatedUser as jest.Mock;
  const client = createClient as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    { memberNumber: 'DAY10000001', benefitType: 'general' },
    { memberId: '00000000-0000-4000-8000-000000000001', benefitType: 'general' },
  ])('rejects an anonymous lookup before using the service role', async (body) => {
    auth.mockResolvedValue({ user: null });

    const response = await POST({ json: async () => body } as unknown as NextRequest);

    expect(response.status).toBe(401);
    expect(client).not.toHaveBeenCalled();
  });

  it('rejects a staff account without provider authority', async () => {
    auth.mockResolvedValue({ user: { id: 'staff-1', roles: ['marketing_manager'], isProvider: false } });

    const response = await POST({ json: async () => ({ memberNumber: 'DAY10000001', benefitType: 'general' }) } as unknown as NextRequest);

    expect(response.status).toBe(403);
    expect(client).not.toHaveBeenCalled();
  });

  it('allows a verified provider to reach the existing member lookup', async () => {
    auth.mockResolvedValue({ user: { id: 'provider-user', isProvider: true, providerId: 'provider-1' } });
    const single = jest.fn().mockResolvedValue({ data: null, error: null });
    const eq = jest.fn().mockReturnValue({ single });
    const select = jest.fn().mockReturnValue({ eq });
    const from = jest.fn().mockReturnValue({ select });
    client.mockReturnValue({ from });

    const response = await POST({ json: async () => ({ memberNumber: 'DAY10000001', benefitType: 'general' }) } as unknown as NextRequest);

    expect(response.status).toBe(404);
    expect(from).toHaveBeenCalledWith('members');
    expect(eq).toHaveBeenCalledWith('member_number', 'DAY10000001');
  });
});
