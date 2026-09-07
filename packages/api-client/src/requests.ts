import type {
  DeleteMeResponse,
  EventOccurrencesQuery,
  EventOccurrencesResponse,
  EventQuery,
  EventResponse,
  OccurrenceResponse,
  DeviceResponse,
  EventsListQuery,
  EventsListResponse,
  EventsMapQuery,
  EventsMapResponse,
  HealthResponse,
  MeResponse,
  RegisterDeviceBody,
  SignInResponse,
  SignInWithAppleBody,
  SignInWithGoogleBody,
  UpdateDeviceBody,
  UpdateMeBody,
} from '@curb/types';

import { unwrap, type ApiClient } from './client';

// One typed function per operation, shared by the TanStack Query layer and
// by non-React callers (the mobile auth store, React Router loaders).
// Every function resolves the parsed body or throws ApiError.
export const api = {
  health: {
    get: async (client: ApiClient): Promise<HealthResponse> =>
      unwrap(await client.GET('/v1/health')),
  },
  auth: {
    apple: async (client: ApiClient, body: SignInWithAppleBody): Promise<SignInResponse> =>
      unwrap(await client.POST('/v1/auth/apple', { body })),
    google: async (client: ApiClient, body: SignInWithGoogleBody): Promise<SignInResponse> =>
      unwrap(await client.POST('/v1/auth/google', { body })),
    signOut: async (client: ApiClient): Promise<void> => {
      unwrap(await client.DELETE('/v1/auth/session'));
    },
  },
  me: {
    get: async (client: ApiClient): Promise<MeResponse> => unwrap(await client.GET('/v1/me')),
    update: async (client: ApiClient, body: UpdateMeBody): Promise<MeResponse> =>
      unwrap(await client.PATCH('/v1/me', { body })),
    destroy: async (client: ApiClient): Promise<DeleteMeResponse> =>
      unwrap(await client.DELETE('/v1/me')),
  },
  events: {
    // Public lists (docs/api.md Events); the discovery hooks (1.11, 1.12)
    // build on these.
    list: async (client: ApiClient, query: EventsListQuery = {}): Promise<EventsListResponse> =>
      unwrap(await client.GET('/v1/events', { params: { query } })),
    map: async (client: ApiClient, query: EventsMapQuery): Promise<EventsMapResponse> =>
      unwrap(await client.GET('/v1/events/map', { params: { query } })),
    // Detail by slug; `token` unlocks an unlisted event and `near` fills
    // the nearby list on a 410 (docs/api.md Events).
    get: async (client: ApiClient, slug: string, query: EventQuery = {}): Promise<EventResponse> =>
      unwrap(await client.GET('/v1/events/{slug}', { params: { path: { slug }, query } })),
    confirm: async (client: ApiClient, id: string): Promise<EventResponse> =>
      unwrap(await client.POST('/v1/events/{id}/confirm', { params: { path: { id } } })),
    occurrences: async (
      client: ApiClient,
      id: string,
      query: EventOccurrencesQuery = {},
    ): Promise<EventOccurrencesResponse> =>
      unwrap(await client.GET('/v1/events/{id}/occurrences', { params: { path: { id }, query } })),
  },
  occurrences: {
    get: async (client: ApiClient, id: string): Promise<OccurrenceResponse> =>
      unwrap(await client.GET('/v1/occurrences/{id}', { params: { path: { id } } })),
  },
  devices: {
    register: async (client: ApiClient, body: RegisterDeviceBody): Promise<DeviceResponse> =>
      unwrap(await client.POST('/v1/devices', { body })),
    update: async (
      client: ApiClient,
      anonymousId: string,
      body: UpdateDeviceBody,
    ): Promise<DeviceResponse> =>
      unwrap(
        await client.PATCH('/v1/devices/{anonymous_id}', {
          params: { path: { anonymous_id: anonymousId } },
          body,
        }),
      ),
  },
};
