/** @jest-environment node */

import { getAuthenticatedUser } from '@/lib/auth-server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { POST } from '../route';
import { PATCH } from '../[id]/route';

jest.mock('@/lib/auth-server', () => ({ getAuthenticatedUser: jest.fn() }));
jest.mock('@/lib/supabase-server', () => ({ createServerSupabaseClient: jest.fn() }));

const payload = {
  name: 'Connected operations',
  slug: 'connected-operations',
  title: 'Your operations, connected.',
  description: 'Bring teams and workflows together.',
  ctaLabel: 'Enter your workspace',
  ctaHref: '/login',
  status: 'draft',
};

function request(body: unknown = payload) {
  return { json: jest.fn().mockResolvedValue(body) } as any;
}

describe('POST /api/marketing/landing-pages', () => {
  const mockAuth = getAuthenticatedUser as jest.Mock;
  const mockClient = createServerSupabaseClient as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: 'user-1', roles: ['marketing_manager'] } });
  });

  it('requires an authenticated marketing role', async () => {
    mockAuth.mockResolvedValueOnce({ user: null });
    expect((await POST(request())).status).toBe(401);
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-2', roles: ['provider'] } });
    expect((await POST(request())).status).toBe(403);
    expect(mockClient).not.toHaveBeenCalled();
  });

  it('validates input before accessing the database', async () => {
    expect((await POST(request({ ...payload, slug: 'Bad Slug' }))).status).toBe(400);
    expect(mockClient).not.toHaveBeenCalled();
  });

  it('inserts a KERVOX draft and returns the saved row', async () => {
    const saved = { id: 'page-1', ...payload, template: 'kervox' };
    const single = jest.fn().mockResolvedValue({ data: saved, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    mockClient.mockReturnValue({ from: jest.fn().mockReturnValue({ insert }) });

    const response = await POST(request());

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(saved);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      name: payload.name,
      slug: payload.slug,
      template: 'kervox',
      status: 'draft',
      created_by: 'user-1',
      content: expect.objectContaining({ cta: { label: payload.ctaLabel, href: '/login' } }),
    }));
  });
});

describe('PATCH /api/marketing/landing-pages/[id]', () => {
  const mockAuth = getAuthenticatedUser as jest.Mock;
  const mockClient = createServerSupabaseClient as jest.Mock;
  const pageId = '00000000-0000-4000-8000-000000000001';

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: 'user-1', roles: ['marketing_manager'] } });
  });

  it('preserves stored page sections when publishing an edited page', async () => {
    const existing = { content: { sections: [{ type: 'hero' }] }, metadata: { campaign: 'server-launch' } };
    const readSingle = jest.fn().mockResolvedValue({ data: existing, error: null });
    const readEq = jest.fn().mockReturnValue({ maybeSingle: readSingle });
    const updated = { id: pageId, ...payload, status: 'active' };
    const writeSingle = jest.fn().mockResolvedValue({ data: updated, error: null });
    const writeSelect = jest.fn().mockReturnValue({ single: writeSingle });
    const writeEq = jest.fn().mockReturnValue({ select: writeSelect });
    const update = jest.fn().mockReturnValue({ eq: writeEq });
    const from = jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ eq: readEq }), update });
    mockClient.mockReturnValue({ from });

    const response = await PATCH(request({ ...payload, status: 'active' }), { params: Promise.resolve({ id: pageId }) });

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'active',
      content: expect.objectContaining({ sections: existing.content.sections }),
      metadata: expect.objectContaining({ campaign: 'server-launch' }),
    }));
  });
});
