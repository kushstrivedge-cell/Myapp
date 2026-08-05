import {API_BASE_URL} from '../config/api';
import {
  AuthTokens,
  clearTokens,
  readTokens,
  saveTokens,
} from './tokenStorage';

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: {code?: string; message?: string; details?: unknown};
};

type RequestOptions = RequestInit & {
  authenticated?: boolean;
  retryOnUnauthorized?: boolean;
};

type RefreshPayload = AuthTokens & {user?: unknown};

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status = 0, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let refreshPromise: Promise<RefreshPayload> | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;

  let body: ApiEnvelope<T>;
  try {
    body = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError('The server returned an invalid response.', response.status);
  }

  if (!response.ok || !body.success) {
    throw new ApiError(
      body.error?.message ?? 'Request failed.',
      response.status,
      body.error?.code,
      body.error?.details,
    );
  }

  return body.data as T;
}

async function send<T>(
  path: string,
  options: RequestOptions,
  accessToken?: string,
): Promise<{response: Response; data?: T}> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
    return {response};
  } catch {
    throw new ApiError(
      'You appear to be offline or the Cartly server cannot be reached.',
      0,
      'NETWORK_ERROR',
    );
  }
}

async function refreshAccessToken(refreshToken: string) {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const {response} = await send<RefreshPayload>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({refreshToken}),
        authenticated: false,
      });
      const payload = await parseResponse<RefreshPayload>(response);
      await saveTokens(payload);
      return payload;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const authenticated = options.authenticated ?? true;
  const retryOnUnauthorized = options.retryOnUnauthorized ?? true;
  const tokens = authenticated ? await readTokens() : null;
  const first = await send<T>(path, options, tokens?.accessToken);

  if (
    first.response.status === 401 &&
    authenticated &&
    retryOnUnauthorized &&
    tokens?.refreshToken
  ) {
    try {
      const refreshed = await refreshAccessToken(tokens.refreshToken);
      const retry = await send<T>(
        path,
        {...options, retryOnUnauthorized: false},
        refreshed.accessToken,
      );
      return parseResponse<T>(retry.response);
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 401 || error.status === 403)
      ) {
        await clearTokens();
        unauthorizedHandler?.();
      }
      throw error;
    }
  }

  if (first.response.status === 401 && authenticated) {
    await clearTokens();
    unauthorizedHandler?.();
  }

  return parseResponse<T>(first.response);
}

export function apiGet<T>(path: string, options: RequestOptions = {}) {
  return apiRequest<T>(path, {...options, method: 'GET'});
}

export function apiPost<T>(
  path: string,
  body: unknown,
  options: RequestOptions = {},
) {
  return apiRequest<T>(path, {
    ...options,
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function apiPatch<T>(
  path: string,
  body: unknown,
  options: RequestOptions = {},
) {
  return apiRequest<T>(path, {
    ...options,
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function apiDelete<T>(
  path: string,
  body?: unknown,
  options: RequestOptions = {},
) {
  return apiRequest<T>(path, {
    ...options,
    method: 'DELETE',
    ...(body === undefined ? {} : {body: JSON.stringify(body)}),
  });
}
