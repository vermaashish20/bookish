import { API_BASE_URL } from '@/config/env';
import { getAuthToken } from './auth';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = RequestInit & { _authRetry?: boolean };

function buildHeaders(
  token: string | null,
  isFormData: boolean,
  extra?: HeadersInit,
): HeadersInit {
  const headers = new Headers(extra);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return headers;
}

export async function request<T>(path: string, options?: RequestOptions): Promise<T> {
  const { _authRetry, ...fetchOptions } = options ?? {};
  const token = await getAuthToken();
  const isFormData = fetchOptions.body instanceof FormData;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchOptions,
    headers: buildHeaders(token, isFormData, fetchOptions.headers),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    const detail = (error as { detail?: string }).detail ?? res.statusText;

    // Fresh Clerk JWTs can fail iat validation when clocks are slightly out of sync.
    const isIatSkew =
      res.status === 401 &&
      typeof detail === 'string' &&
      detail.toLowerCase().includes('not yet valid') &&
      !_authRetry;

    if (isIatSkew) {
      await new Promise((resolve) => setTimeout(resolve, 750));
      return request<T>(path, { ...options, _authRetry: true });
    }

    throw new ApiError(detail, res.status);
  }

  return res.json() as Promise<T>;
}
