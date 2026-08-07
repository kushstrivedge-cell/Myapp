const base = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1';
let accessToken = localStorage.getItem('cartly-admin-token') ?? '';
let refreshToken = localStorage.getItem('cartly-admin-refresh') ?? '';
let refreshPromise: Promise<boolean> | null = null;
export const hasAdminSession = () => Boolean(accessToken && refreshToken);
export const setTokens = (access: string, refresh: string) => {
  accessToken = access;
  refreshToken = refresh;
  if (access && refresh) {
    localStorage.setItem('cartly-admin-token', access);
    localStorage.setItem('cartly-admin-refresh', refresh);
  } else {
    localStorage.removeItem('cartly-admin-token');
    localStorage.removeItem('cartly-admin-refresh');
  }
};
const expire = () => {
  setTokens('', '');
  window.dispatchEvent(new Event('cartly-admin-expired'));
};
async function refreshSession() {
  if (!refreshToken) return false;
  if (!refreshPromise)
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${base}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        const body = await response.json();
        if (!response.ok || !body.success || body.data?.user?.role !== 'ADMIN')
          return false;
        setTokens(body.data.accessToken, body.data.refreshToken);
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });
  if (
    response.status === 401 &&
    retry &&
    path !== '/auth/login' &&
    path !== '/auth/refresh'
  ) {
    if (await refreshSession()) return api<T>(path, options, false);
    expire();
    throw new Error(
      'Your administrator session expired. Please sign in again.',
    );
  }
  if (response.status === 204) return undefined as T;
  const body = await response.json();
  if (!response.ok || !body.success)
    throw new Error(body.error?.message ?? 'Request failed');
  return body.data as T;
}
export const get = <T>(path: string) => api<T>(path);
export const post = <T>(path: string, data: unknown) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(data) });
export const patch = <T>(path: string, data: unknown) =>
  api<T>(path, { method: 'PATCH', body: JSON.stringify(data) });
export const remove = (path: string) => api<void>(path, { method: 'DELETE' });
