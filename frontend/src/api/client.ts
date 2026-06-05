const BASE_URL = 'http://localhost:8080/api/v1';

type ApiOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  auth?: boolean;
};

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, auth = true, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string> | undefined),
  };

  if (auth) {
    const token = localStorage.getItem('token');
    if (token) finalHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 401/403 → 토큰 만료/무효 → 로그아웃 처리
  if ((response.status === 401 || response.status === 403) && auth) {
    localStorage.removeItem('token');
    window.dispatchEvent(new Event('auth:logout'));
  }

  const responseBody = await response.json().catch(() => null);

  if (!response.ok) {
    const message = responseBody?.message ?? `요청 실패 (${response.status})`;
    throw new ApiError(message, response.status, responseBody);
  }

  return responseBody as T;
}

export const api = {
  get: <T>(path: string, options?: ApiOptions) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: ApiOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: ApiOptions) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: ApiOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: ApiOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};
