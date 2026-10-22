import { supabase } from '@/lib/supabase';

const ACCESS_TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';

let restoreSessionPromise: Promise<string | null> | null = null;
let refreshSessionPromise: Promise<string | null> | null = null;

function persistSession(session: { access_token: string; refresh_token: string }) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, session.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, session.refresh_token);
}

async function restoreStoredSession(accessToken: string, refreshToken: string): Promise<string | null> {
  if (!restoreSessionPromise) {
    restoreSessionPromise = supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ data, error }) => {
        if (error || !data.session) return null;
        persistSession(data.session);
        return data.session.access_token;
      })
      .catch(() => null)
      .finally(() => { restoreSessionPromise = null; });
  }
  return restoreSessionPromise;
}

async function refreshStoredSession(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  if (!refreshSessionPromise) {
    refreshSessionPromise = supabase.auth
      .refreshSession({ refresh_token: refreshToken })
      .then(({ data, error }) => {
        if (error || !data.session) return null;
        persistSession(data.session);
        return data.session.access_token;
      })
      .catch(() => null)
      .finally(() => { refreshSessionPromise = null; });
  }
  return refreshSessionPromise;
}

export async function getAuthHeaders(extraHeaders?: HeadersInit): Promise<Headers> {
  const headers = new Headers(extraHeaders);

  try {
    // Supabase refreshes an expired session here. Prefer it over the legacy
    // access-token copy, which otherwise becomes stale in long-lived tabs.
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      persistSession(session);
      headers.set('Authorization', `Bearer ${session.access_token}`);
      return headers;
    }
  } catch {
    // A temporarily unavailable auth service should not discard a stored token.
  }

  if (typeof window !== 'undefined') {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    const recovered = accessToken && refreshToken
      ? await restoreStoredSession(accessToken, refreshToken)
      : null;
    if (recovered || accessToken) {
      headers.set('Authorization', `Bearer ${recovered || accessToken}`);
    }
  }

  return headers;
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const response = await fetch(input, {
    ...init,
    headers: await getAuthHeaders(init.headers),
  });

  const method = init.method || (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET');
  if (response.status !== 401 || !['GET', 'HEAD'].includes(method.toUpperCase())) return response;

  const body = await response.clone().json().catch(() => null);
  if (body?.code !== 'INVALID_TOKEN') return response;

  const refreshedToken = await refreshStoredSession();
  if (!refreshedToken) return response;

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${refreshedToken}`);
  return fetch(input, { ...init, headers });
}
