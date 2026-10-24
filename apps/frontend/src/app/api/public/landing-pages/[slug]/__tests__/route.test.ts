/** @jest-environment node */

import type { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { GET } from '../route';

jest.mock('@/lib/supabase-server', () => ({ createServerSupabaseClient: jest.fn() }));

describe('GET /api/public/landing-pages/[slug]', () => {
  const mockClient = createServerSupabaseClient as jest.Mock;

  beforeEach(() => jest.clearAllMocks());

  it('returns only published-page fields, never internal metadata or creator IDs', async () => {
    const page = {
      id: 'page-1', name: 'Server marketplace', slug: 'server-marketplace',
      title: 'Server products', description: 'Browse equipment.', template: 'kervox',
      content: { sections: [] }, status: 'active',
    };
    const single = jest.fn().mockResolvedValue({ data: page, error: null });
    const eq = jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single }) });
    const select = jest.fn().mockReturnValue({ eq });
    mockClient.mockReturnValue({ from: jest.fn().mockReturnValue({ select }) });

    const response = await GET({} as NextRequest, { params: Promise.resolve({ slug: page.slug }) });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(page);
    expect(select).toHaveBeenCalledWith('id,name,slug,title,description,template,content,status');
    expect(eq).toHaveBeenCalledWith('slug', page.slug);
    expect(eq.mock.results[0].value.eq).toHaveBeenCalledWith('status', 'active');
  });

  it('does not expose an unpublished page', async () => {
    const single = jest.fn().mockResolvedValue({ data: null, error: null });
    const activeEq = jest.fn().mockReturnValue({ single });
    const eq = jest.fn().mockReturnValue({ eq: activeEq });
    mockClient.mockReturnValue({ from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ eq }) }) });

    const response = await GET({} as NextRequest, { params: Promise.resolve({ slug: 'draft-page' }) });

    expect(response.status).toBe(404);
    expect(activeEq).toHaveBeenCalledWith('status', 'active');
  });
});
