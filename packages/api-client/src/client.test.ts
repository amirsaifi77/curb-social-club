import { describe, expect, it, vi } from 'vitest';

import { ApiError, createClient, errorDetails, errorStatus, unwrap } from './client';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('createClient', () => {
  it('injects the bearer token and X-Device-Id on every request', async () => {
    const fetchMock = vi.fn(async (_input: Request) =>
      jsonResponse(200, { status: 'ok', db: true, queue_lag_s: 0 }),
    );
    const client = createClient({
      baseUrl: 'https://api.example',
      fetch: fetchMock as unknown as typeof fetch,
      getToken: async () => 'tok',
      getDeviceId: () => 'device-1',
    });

    await client.GET('/v1/health');

    const request = fetchMock.mock.calls[0]?.[0];
    if (!request) throw new Error('fetch was not called');
    expect(request.headers.get('Authorization')).toBe('Bearer tok');
    expect(request.headers.get('X-Device-Id')).toBe('device-1');
  });

  it('sends no Authorization header without a token', async () => {
    const fetchMock = vi.fn(async (_input: Request) =>
      jsonResponse(200, { status: 'ok', db: true, queue_lag_s: 0 }),
    );
    const client = createClient({
      baseUrl: 'https://api.example',
      fetch: fetchMock as unknown as typeof fetch,
      getToken: () => null,
    });

    await client.GET('/v1/health');

    const request = fetchMock.mock.calls[0]?.[0];
    if (!request) throw new Error('fetch was not called');
    expect(request.headers.has('Authorization')).toBe(false);
  });

  it('calls onUnauthorized on a 401 and unwrap throws the envelope as ApiError', async () => {
    const onUnauthorized = vi.fn();
    const fetchMock = vi.fn(async () =>
      jsonResponse(401, { error: { code: 'unauthenticated', message: 'Sign in to continue' } }),
    );
    const client = createClient({
      baseUrl: 'https://api.example',
      fetch: fetchMock as unknown as typeof fetch,
      onUnauthorized,
    });

    const result = await client.GET('/v1/me');
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(() => unwrap(result)).toThrow(ApiError);
    try {
      unwrap(result);
    } catch (e) {
      expect(e).toMatchObject({
        code: 'unauthenticated',
        status: 401,
        message: 'Sign in to continue',
      });
    }
  });

  it('unwrap returns the parsed body on success and carries details on 422', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(422, {
        error: {
          code: 'validation_failed',
          message: 'Handle is taken',
          details: { handle: ['taken'] },
        },
      }),
    );
    const client = createClient({
      baseUrl: 'https://api.example',
      fetch: fetchMock as unknown as typeof fetch,
    });
    const result = await client.PATCH('/v1/me', { body: { profile: { handle: 'taken' } } });
    let caught: unknown;
    try {
      unwrap(result);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).details).toEqual({ handle: ['taken'] });

    const ok = unwrap({ data: { data: { purge_after: 'x' } }, response: jsonResponse(202, {}) });
    expect(ok.data.purge_after).toBe('x');
  });
});

describe('errorStatus and errorDetails', () => {
  it('read an ApiError', () => {
    const error = new ApiError('gone', 'Gone', 410, { nearby: [] });
    expect(errorStatus(error)).toBe(410);
    expect(errorDetails(error)).toEqual({ nearby: [] });
  });

  it('read an error that lost its prototype on the way out of the persister', () => {
    const rehydrated = { name: 'ApiError', message: 'Gone', status: 410, details: { nearby: [] } };
    expect(errorStatus(rehydrated)).toBe(410);
    expect(errorDetails(rehydrated)).toEqual({ nearby: [] });
  });

  it('answer null for anything that is not one', () => {
    expect(errorStatus(new Error('offline'))).toBeNull();
    expect(errorStatus(null)).toBeNull();
    expect(errorStatus({ status: 'nope' })).toBeNull();
    expect(errorDetails(new Error('offline'))).toBeNull();
    expect(errorDetails({ details: 'a string' })).toBeNull();
  });
});
