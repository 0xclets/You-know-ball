const configuredApi = process.env.NEXT_PUBLIC_API_URL;
export const API_BASE = configuredApi ? (/^https?:\/\//i.test(configuredApi) ? configuredApi : 'https://' + configuredApi) : 'http://localhost:4000';

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
  const refreshResponse = await fetch(API_BASE + '/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  });
  const refreshData = await refreshResponse.json();
  if (!refreshResponse.ok) {
    sessionStorage.removeItem('ykbAccessToken');
    window.location.href = '/login';
    throw new Error('Your session expired. Please sign in again.');
  }
  sessionStorage.setItem('ykbAccessToken', refreshData.accessToken);
  response = await fetch(API + path, {
    ...init,
    credentials: 'include',
    headers: { ...(init.headers ?? {}), authorization: 'Bearer ' + refreshData.accessToken },
  });
  return response;
}
