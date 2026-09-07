import type { paths } from '@curb/types';

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

// The operations the client wraps, by name. The contract test checks each
// one against the generated types at runtime, and OperationExists makes the
// same check at compile time, so a hook can never outlive its endpoint.
export const endpoints = {
  health: { path: '/v1/health', method: 'get' },
  signInWithApple: { path: '/v1/auth/apple', method: 'post' },
  signInWithGoogle: { path: '/v1/auth/google', method: 'post' },
  signOut: { path: '/v1/auth/session', method: 'delete' },
  me: { path: '/v1/me', method: 'get' },
  updateMe: { path: '/v1/me', method: 'patch' },
  deleteAccount: { path: '/v1/me', method: 'delete' },
  registerDevice: { path: '/v1/devices', method: 'post' },
  updateDevice: { path: '/v1/devices/{anonymous_id}', method: 'patch' },
  listEvents: { path: '/v1/events', method: 'get' },
  eventsMap: { path: '/v1/events/map', method: 'get' },
} as const satisfies Record<string, { path: keyof paths; method: HttpMethod }>;

export type EndpointName = keyof typeof endpoints;

type OperationExists<E> = E extends {
  path: infer P extends keyof paths;
  method: infer M extends string;
}
  ? M extends keyof paths[P]
    ? NonNullable<paths[P][M]> extends never
      ? never
      : E
    : never
  : never;

type EveryOperationExists = { [K in EndpointName]: OperationExists<(typeof endpoints)[K]> };

// Fails to compile when an entry names a path or method the spec lacks.
export const checkedEndpoints: EveryOperationExists = endpoints;
