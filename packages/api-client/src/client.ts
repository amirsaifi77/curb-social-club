import type { ApiErrorBody, paths } from '@curb/types';
import createOpenapiClient, { type Middleware } from 'openapi-fetch';

type MaybePromise<T> = T | Promise<T>;

export interface ClientOptions {
  baseUrl: string;
  // Session token from the platform's secure storage (Keychain on mobile).
  getToken?: () => MaybePromise<string | null | undefined>;
  // Persisted client UUID sent as X-Device-Id on every request.
  getDeviceId?: () => MaybePromise<string | null | undefined>;
  // Called on any 401 so the caller can clear the token and sign out (R-24).
  onUnauthorized?: () => MaybePromise<void>;
  fetch?: typeof fetch;
}

// Read structurally, never with instanceof: an error that came back out of
// the query persister is a plain object with the prototype gone, and a
// duplicated copy of this package under pnpm is a different class again.
// Both would make an `instanceof` check quietly answer "not an API error"
// and retry a 404.
export function errorStatus(error: unknown): number | null {
  if (typeof error !== 'object' || error === null || !('status' in error)) return null;
  const status = Number((error as { status: unknown }).status);
  return Number.isFinite(status) ? status : null;
}

export function errorDetails(error: unknown): Record<string, unknown> | null {
  if (typeof error !== 'object' || error === null || !('details' in error)) return null;
  const details = (error as { details: unknown }).details;
  return typeof details === 'object' && details !== null
    ? (details as Record<string, unknown>)
    : null;
}

// The API error envelope, normalized (docs/api.md).
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: Record<string, unknown> | null;

  constructor(
    code: string,
    message: string,
    status: number,
    details?: Record<string, unknown> | null,
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details ?? null;
  }

  static fromResponse(status: number, body: unknown): ApiError {
    const envelope = body as Partial<ApiErrorBody> | null;
    const error = envelope?.error;
    if (error && typeof error.code === 'string') {
      return new ApiError(error.code, error.message ?? error.code, status, error.details ?? null);
    }
    return new ApiError(defaultCode(status), `Request failed with status ${status}`, status);
  }
}

function defaultCode(status: number): string {
  if (status === 401) return 'unauthenticated';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 429) return 'rate_limited';
  return status >= 500 ? 'internal_error' : 'bad_request';
}

export type ApiClient = ReturnType<typeof createOpenapiClient<paths>>;

export function createClient(options: ClientOptions): ApiClient {
  const client = createOpenapiClient<paths>({ baseUrl: options.baseUrl, fetch: options.fetch });

  const auth: Middleware = {
    async onRequest({ request }) {
      const token = await options.getToken?.();
      if (token) request.headers.set('Authorization', `Bearer ${token}`);
      const deviceId = await options.getDeviceId?.();
      if (deviceId) request.headers.set('X-Device-Id', deviceId);
      return request;
    },
    async onResponse({ response }) {
      if (response.status === 401) await options.onUnauthorized?.();
      return response;
    },
  };
  client.use(auth);
  return client;
}

// Turns an openapi-fetch result into the parsed body or an ApiError.
export function unwrap<T>(result: { data?: T; error?: unknown; response: Response }): T {
  if (result.error !== undefined || !result.response.ok) {
    throw ApiError.fromResponse(result.response.status, result.error);
  }
  return result.data as T;
}
