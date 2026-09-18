const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const TOKEN_STORAGE_KEY = 'carlot.accessToken';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

function extractMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message: unknown }).message;
    if (Array.isArray(message)) return message.join(' ');
    if (typeof message === 'string') return message;
  }
  return fallback;
}

const GENERIC_ERROR_MESSAGE = 'אירעה שגיאה בלתי צפויה. נסו שוב, ואם זה חוזר על עצמו פנו לתמיכה.';
const NETWORK_ERROR_MESSAGE = 'אין חיבור לשרת. בדקו את החיבור לאינטרנט ונסו שוב.';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(0, NETWORK_ERROR_MESSAGE);
  }

  if (response.status === 401) {
    clearToken();
  }

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      // no JSON body on this error response — fall back below
    }
    throw new ApiError(response.status, extractMessage(body, GENERIC_ERROR_MESSAGE));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function upload<T>(path: string, formData: FormData): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { method: 'POST', headers, body: formData });
  } catch {
    throw new ApiError(0, NETWORK_ERROR_MESSAGE);
  }

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      // no JSON body on this error response — fall back below
    }
    throw new ApiError(response.status, extractMessage(body, GENERIC_ERROR_MESSAGE));
  }

  return (await response.json()) as T;
}

async function download(path: string): Promise<{ blob: Blob; fileName: string }> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { headers });
  } catch {
    throw new ApiError(0, NETWORK_ERROR_MESSAGE);
  }

  if (!response.ok) {
    throw new ApiError(response.status, GENERIC_ERROR_MESSAGE);
  }

  const disposition = response.headers.get('Content-Disposition') ?? '';
  const match = /filename="?([^"]+)"?/.exec(disposition);
  const fileName = match ? decodeURIComponent(match[1]) : 'document';
  return { blob: await response.blob(), fileName };
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  upload,
  download,
};

export { API_URL };
