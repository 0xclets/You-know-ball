const configuredApi = process.env.NEXT_PUBLIC_API_URL;
export const API_BASE = configuredApi ? (/^https?:\/\//i.test(configuredApi) ? configuredApi : 'https://' + configuredApi) : (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:4000');

let refreshInFlight: Promise<string> | null = null;
async function freshAccessToken(): Promise<string> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const response = await fetch(API_BASE + '/auth/refresh', { method: 'POST', credentials: 'include' });
      const data = await response.json();
      if (!response.ok || typeof data.accessToken !== 'string') throw new Error('Your session expired. Please sign in again.');
      sessionStorage.setItem('ykbAccessToken', data.accessToken);
      return data.accessToken as string;
    })().finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

export async function authenticatedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const access = sessionStorage.getItem('ykbAccessToken');
  if (!access) {
    window.location.href = '/login';
    throw new Error('Please sign in.');
  }
  let response = await fetch(API_BASE + path, {
    ...init,
    credentials: 'include',
    headers: { ...(init.headers ?? {}), authorization: 'Bearer ' + access },
  });
  if (response.status !== 401) return response;
  let nextAccess: string;
  try {
    nextAccess = await freshAccessToken();
  } catch (error) {
    sessionStorage.removeItem('ykbAccessToken');
    window.location.href = '/login';
    throw error;
  }
  response = await fetch(API_BASE + path, {
    ...init,
    credentials: 'include',
    headers: { ...(init.headers ?? {}), authorization: 'Bearer ' + nextAccess },
  });
  return response;
}
