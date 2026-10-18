const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function authenticatedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const access = sessionStorage.getItem('ykbAccessToken');
  if (!access) {
    window.location.href = '/login';
    throw new Error('Please sign in.');
  }
  let response = await fetch(API + path, {
    ...init,
    headers: { ...(init.headers ?? {}), authorization: 'Bearer ' + access },
  });
  if (response.status !== 401) return response;
  const refreshToken = sessionStorage.getItem('ykbRefreshToken');
  if (!refreshToken) {
    sessionStorage.removeItem('ykbAccessToken');
    window.location.href = '/login';
    throw new Error('Your session expired. Please sign in again.');
  }
  const refreshResponse = await fetch(API + '/auth/refresh', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  const refreshData = await refreshResponse.json();
  if (!refreshResponse.ok) {
    sessionStorage.removeItem('ykbAccessToken');
    sessionStorage.removeItem('ykbRefreshToken');
    window.location.href = '/login';
    throw new Error('Your session expired. Please sign in again.');
  }
  sessionStorage.setItem('ykbAccessToken', refreshData.accessToken);
  sessionStorage.setItem('ykbRefreshToken', refreshData.refreshToken);
  response = await fetch(API + path, {
    ...init,
    headers: { ...(init.headers ?? {}), authorization: 'Bearer ' + refreshData.accessToken },
  });
  return response;
}
