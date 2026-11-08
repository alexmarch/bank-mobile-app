import { Platform } from 'react-native';

export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000')
).replace(/\/$/, '');

export const fetchBankConfig = () => send('/public/bank-config');

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export type Tokens = { accessToken: string; refreshToken: string };

type RequestInit = { method?: string; body?: unknown; form?: FormData; contentType?: string; binary?: boolean };

export function assetUrl(path?: string | null) {
  return path ? `${API_URL}${path}` : null;
}

export async function send(path: string, init: RequestInit = {}, accessToken?: string) {
  let response: Response;
  const raw = init.form ?? (init.contentType ? (init.body as BodyInit) : undefined);
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: init.method ?? (init.body === undefined && !init.form ? 'GET' : 'POST'),
      headers: {
        ...(init.form ? {} : { 'Content-Type': init.contentType ?? 'application/json' }),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: raw ?? (init.body === undefined ? undefined : JSON.stringify(init.body)),
    });
  } catch {
    throw new ApiError(`Cannot reach API at ${API_URL}. Check the API URL and network connection.`, 0);
  }

  if (init.binary && response.ok) return response.arrayBuffer();
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.message ?? `Request failed (${response.status})`;
    throw new ApiError(Array.isArray(message) ? message.join(', ') : String(message), response.status);
  }
  return data;
}

let tokens: Tokens | null = null;
let onTokensChanged: (next: Tokens | null) => void = () => {};
let refreshing: Promise<string> | null = null;

export function configureApiSession(current: Tokens | null, listener: (next: Tokens | null) => void) {
  tokens = current;
  onTokensChanged = listener;
}

// Refresh tokens are single-use, so concurrent 401s share one refresh call.
function refreshTokens() {
  const current = tokens;
  if (!current) return Promise.reject(new ApiError('Session expired', 401));
  refreshing ??= send('/auth/refresh', { method: 'POST', body: { refreshToken: current.refreshToken } })
    .then((data) => {
      tokens = { accessToken: data.accessToken, refreshToken: data.refreshToken };
      onTokensChanged(tokens);
      return data.accessToken as string;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function request(path: string, init: RequestInit = {}) {
  try {
    return await send(path, init, tokens?.accessToken);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || !tokens) throw error;
    let token: string;
    try {
      token = await refreshTokens();
    } catch {
      tokens = null;
      onTokensChanged(null);
      throw error;
    }
    return send(path, init, token);
  }
}

export const api = {
  get: (path: string) => request(path),
  post: (path: string, body?: unknown) => request(path, { method: 'POST', body: body ?? {} }),
  patch: (path: string, body: unknown) => request(path, { method: 'PATCH', body }),
  delete: (path: string) => request(path, { method: 'DELETE' }),
  postForm: (path: string, form: FormData) => request(path, { method: 'POST', form }),
  upload: (path: string, file: Blob) =>
    request(path, { method: 'POST', body: file, contentType: file.type || 'application/octet-stream' }),
  getBytes: (path: string) => request(path, { binary: true }) as Promise<ArrayBuffer>,
  currentRefreshToken: () => tokens?.refreshToken ?? null,
};
