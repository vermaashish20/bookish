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

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getAuthToken();
  const isFormData = options?.body instanceof FormData;

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: isFormData
      ? { ...authHeaders, ...options?.headers }
      : { 'Content-Type': 'application/json', ...authHeaders, ...options?.headers },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    const detail = (error as { detail?: string }).detail ?? res.statusText;
    throw new ApiError(detail, res.status);
  }

  return res.json() as Promise<T>;
}
