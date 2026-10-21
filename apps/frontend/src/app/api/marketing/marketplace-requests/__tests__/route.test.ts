/** @jest-environment node */

import { getAuthenticatedUser } from '@/lib/auth-server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { GET, PATCH } from '../route';

jest.mock('@/lib/auth-server', () => ({ getAuthenticatedUser: jest.fn() }));
jest.mock('@/lib/supabase-server', () => ({ createServerSupabaseClient: jest.fn() }));

const requestId = '00000000-0000-4000-8000-000000000001';

describe('marketing marketplace requests', () => {
  const auth = getAuthenticatedUser as jest.Mock;
  const client = createServerSupabaseClient as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    auth.mockResolvedValue({ user: { id: 'marketing-1', roles: ['marketing_manager'] } });
  });

  it('does not expose contact details to anonymous or unrelated users', async () => {
    auth.mockResolvedValueOnce({ user: null });
    expect((await GET({} as any)).status).toBe(401);
    auth.mockResolvedValueOnce({ user: { roles: ['provider'] } });
    expect((await GET({} as any)).status).toBe(403);
    expect(client).not.toHaveBeenCalled();
  });

  it('lists recent requests for marketing staff', async () => {
    const limit = jest.fn().mockResolvedValue({ data: [{ id: requestId }], error: null });
    const order = jest.fn().mockReturnValue({ limit });
    const select = jest.fn().mockReturnValue({ order });
    client.mockReturnValue({ from: jest.fn().mockReturnValue({ select }) });
    const response = await GET({} as any);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: requestId }]);
  });

  it('validates and stores a follow-up status', async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: requestId, status: 'contacted' }, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const eq = jest.fn().mockReturnValue({ select });
    const update = jest.fn().mockReturnValue({ eq });
    client.mockReturnValue({ from: jest.fn().mockReturnValue({ update }) });
    const response = await PATCH({ json: async () => ({ id: requestId, status: 'contacted' }) } as any);
    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ status: 'contacted' });
  });
});
