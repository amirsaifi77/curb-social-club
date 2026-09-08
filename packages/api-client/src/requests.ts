import type {
  ClubEventsQuery,
  ClubEventsResponse,
  ClubMembersQuery,
  ClubMembersResponse,
  ClubResponse,
  ClubsQuery,
  ClubsResponse,
  DeleteMeResponse,
  DeviceResponse,
  FeedQuery,
  FeedResponse,
  EventOccurrencesQuery,
  EventOccurrencesResponse,
  EventQuery,
  EventResponse,
  EventsListQuery,
  EventsListResponse,
  EventsMapQuery,
  EventsMapResponse,
  HealthResponse,
  MeResponse,
  OccurrenceResponse,
  RegisterDeviceBody,
  SponsorEventsQuery,
  SponsorEventsResponse,
  SponsorResponse,
  SponsorsQuery,
  SponsorsResponse,
  UserClubsResponse,
  UserEventsQuery,
  UserEventsResponse,
  UserResponse,
  SignInResponse,
  SignInWithAppleBody,
  SignInWithGoogleBody,
  SitemapResponse,
  UpdateDeviceBody,
  UpdateMeBody,
  VenueSearchQuery,
  VenueSearchResponse,
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
  // Host pages (docs/api.md Clubs, Sponsors, Users and follows). The two
  // write wrappers exist because the endpoints do; both answer 403
  // not_enabled until their feature flag turns on in Phase 7.
  clubs: {
    list: async (client: ApiClient, query: ClubsQuery = {}): Promise<ClubsResponse> =>
      unwrap(await client.GET('/v1/clubs', { params: { query } })),
    get: async (client: ApiClient, slug: string): Promise<ClubResponse> =>
      unwrap(await client.GET('/v1/clubs/{slug}', { params: { path: { slug } } })),
    events: async (
      client: ApiClient,
      slug: string,
      query: ClubEventsQuery = {},
    ): Promise<ClubEventsResponse> =>
      unwrap(await client.GET('/v1/clubs/{slug}/events', { params: { path: { slug }, query } })),
    members: async (
      client: ApiClient,
      slug: string,
      query: ClubMembersQuery = {},
    ): Promise<ClubMembersResponse> =>
      unwrap(await client.GET('/v1/clubs/{slug}/members', { params: { path: { slug }, query } })),
    // Every club write is a Phase 7 endpoint: declared so the client
    // contract is stable, answering 403 not_enabled until the flag is on.
    join: async (client: ApiClient, id: string): Promise<void> => {
      unwrap(await client.PUT('/v1/clubs/{id}/membership', { params: { path: { id } } }));
    },
    leave: async (client: ApiClient, id: string): Promise<void> => {
      unwrap(await client.DELETE('/v1/clubs/{id}/membership', { params: { path: { id } } }));
    },
    create: async (client: ApiClient): Promise<void> => {
      unwrap(await client.POST('/v1/clubs'));
    },
    update: async (client: ApiClient, id: string): Promise<void> => {
      unwrap(await client.PATCH('/v1/clubs/{id}', { params: { path: { id } } }));
    },
    invite: async (client: ApiClient, id: string): Promise<void> => {
      unwrap(await client.POST('/v1/clubs/{id}/invites', { params: { path: { id } } }));
    },
    rotateInviteCode: async (client: ApiClient, id: string): Promise<void> => {
      unwrap(await client.POST('/v1/clubs/{id}/invite_code', { params: { path: { id } } }));
    },
    updateMember: async (client: ApiClient, id: string, userId: string): Promise<void> => {
      unwrap(
        await client.PATCH('/v1/clubs/{id}/members/{user_id}', {
          params: { path: { id, user_id: userId } },
        }),
      );
    },
    removeMember: async (client: ApiClient, id: string, userId: string): Promise<void> => {
      unwrap(
        await client.DELETE('/v1/clubs/{id}/members/{user_id}', {
          params: { path: { id, user_id: userId } },
        }),
      );
    },
  },
  sponsors: {
    list: async (client: ApiClient, query: SponsorsQuery = {}): Promise<SponsorsResponse> =>
      unwrap(await client.GET('/v1/sponsors', { params: { query } })),
    get: async (client: ApiClient, slug: string): Promise<SponsorResponse> =>
      unwrap(await client.GET('/v1/sponsors/{slug}', { params: { path: { slug } } })),
    events: async (
      client: ApiClient,
      slug: string,
      query: SponsorEventsQuery = {},
    ): Promise<SponsorEventsResponse> =>
      unwrap(await client.GET('/v1/sponsors/{slug}/events', { params: { path: { slug }, query } })),
    update: async (client: ApiClient, id: string): Promise<void> => {
      unwrap(await client.PATCH('/v1/sponsors/{id}', { params: { path: { id } } }));
    },
  },
  // Discovery surfaces (docs/api.md Feed, Venues, System).
  feed: {
    get: async (client: ApiClient, query: FeedQuery = {}): Promise<FeedResponse> =>
      unwrap(await client.GET('/v1/feed', { params: { query } })),
  },
  venues: {
    search: async (client: ApiClient, query: VenueSearchQuery): Promise<VenueSearchResponse> =>
      unwrap(await client.GET('/v1/venues/search', { params: { query } })),
  },
  sitemap: {
    get: async (client: ApiClient): Promise<SitemapResponse> =>
      unwrap(await client.GET('/v1/sitemap')),
  },
  users: {
    get: async (client: ApiClient, handle: string): Promise<UserResponse> =>
      unwrap(await client.GET('/v1/users/{handle}', { params: { path: { handle } } })),
    events: async (
      client: ApiClient,
      handle: string,
      query: UserEventsQuery = {},
    ): Promise<UserEventsResponse> =>
      unwrap(
        await client.GET('/v1/users/{handle}/events', { params: { path: { handle }, query } }),
      ),
    clubs: async (client: ApiClient, handle: string): Promise<UserClubsResponse> =>
      unwrap(await client.GET('/v1/users/{handle}/clubs', { params: { path: { handle } } })),
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
