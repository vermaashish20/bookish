import { API_BASE_URL } from '@/config/env';

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
  const isFormData = options?.body instanceof FormData;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: isFormData
      ? options?.headers
      : { 'Content-Type': 'application/json', ...options?.headers },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    const detail = (error as { detail?: string }).detail ?? res.statusText;
    throw new ApiError(detail, res.status);
  }

  return res.json() as Promise<T>;
}
