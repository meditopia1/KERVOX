import { supabase } from '@/lib/supabase';
import { authFetch, getAuthHeaders } from '../auth-fetch';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      setSession: jest.fn(),
      refreshSession: jest.fn(),
    },
  },
}));

const auth = supabase.auth as jest.Mocked<typeof supabase.auth>;

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

it('restores a stored login and uses its refreshed access token', async () => {
  localStorage.setItem('auth_access_token', 'expired-access');
  localStorage.setItem('auth_refresh_token', 'stored-refresh');
  auth.getSession.mockResolvedValue({ data: { session: null }, error: null } as any);
  auth.setSession.mockResolvedValue({
    data: { session: { access_token: 'current-access', refresh_token: 'current-refresh' } },
    error: null,
  } as any);

  const headers = await getAuthHeaders();

  expect(headers.get('Authorization')).toBe('Bearer current-access');
  expect(localStorage.getItem('auth_access_token')).toBe('current-access');
  expect(localStorage.getItem('auth_refresh_token')).toBe('current-refresh');
});

it('prefers the Supabase session over a stale access-token copy', async () => {
  localStorage.setItem('auth_access_token', 'expired-access');
  auth.getSession.mockResolvedValue({
    data: { session: { access_token: 'current-access', refresh_token: 'current-refresh' } },
    error: null,
  } as any);

  const headers = await getAuthHeaders();

  expect(headers.get('Authorization')).toBe('Bearer current-access');
  expect(localStorage.getItem('auth_access_token')).toBe('current-access');
  expect(auth.setSession).not.toHaveBeenCalled();
});

it('refreshes and retries a read request rejected for an expired token', async () => {
  localStorage.setItem('auth_refresh_token', 'stored-refresh');
  auth.getSession.mockResolvedValue({
    data: { session: { access_token: 'old-access', refresh_token: 'stored-refresh' } },
    error: null,
  } as any);
  auth.refreshSession.mockResolvedValue({
    data: { session: { access_token: 'new-access', refresh_token: 'new-refresh' } },
    error: null,
  } as any);
  const rejected = { status: 401, clone: () => ({ json: async () => ({ code: 'INVALID_TOKEN' }) }) };
  const accepted = { status: 200 };
  const fetchMock = jest.fn().mockResolvedValueOnce(rejected).mockResolvedValueOnce(accepted);
  const originalFetch = global.fetch;
  global.fetch = fetchMock;

  try {
    expect(await authFetch('/api/marketing/dashboard')).toBe(accepted);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((fetchMock.mock.calls[1][1].headers as Headers).get('Authorization')).toBe('Bearer new-access');
  } finally {
    global.fetch = originalFetch;
  }
});
