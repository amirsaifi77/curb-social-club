// Types generated from apps/api/swagger/v1/openapi.yaml (session 0.9).
// src/generated.d.ts is openapi-typescript output: committed, regenerated
// with `pnpm --filter @curb/types generate`, never hand-edited.
import type { components, paths } from './generated';

export type { components, paths } from './generated';

export type ApiPath = keyof paths;

type Schemas = components['schemas'];

export type ApiErrorBody = Schemas['Error'];
export type Profile = Schemas['Profile'];
export type User = Schemas['User'];
export type Device = Schemas['Device'];
export type Host = Schemas['Host'];
export type EventSummary = Schemas['EventSummary'];
export type EventDetail = Schemas['Event'];
export type Occurrence = Schemas['Occurrence'];
export type SponsorSummary = Schemas['SponsorSummary'];
export type SponsorDetail = Schemas['Sponsor'];
export type ClubSummary = Schemas['ClubSummary'];
export type ClubDetail = Schemas['Club'];
export type MiniProfile = Schemas['MiniProfile'];
export type MapPin = Schemas['MapPin'];

type Operation<P extends ApiPath, M extends keyof paths[P]> = NonNullable<paths[P][M]>;

// The JSON body of one response status, so callers never spell out the
// content-type nesting: JsonResponse<'/v1/me', 'get', 200>.
export type JsonResponse<P extends ApiPath, M extends keyof paths[P], S extends number> =
  Operation<P, M> extends { responses: infer R }
    ? S extends keyof R
      ? R[S] extends { content: { 'application/json': infer Body } }
        ? Body
        : never
      : never
    : never;

// The JSON request body of one operation: JsonRequest<'/v1/devices', 'post'>.
export type JsonRequest<P extends ApiPath, M extends keyof paths[P]> =
  Operation<P, M> extends { requestBody?: infer Request }
    ? [NonNullable<Request>] extends [never]
      ? never
      : NonNullable<Request> extends { content: { 'application/json': infer Body } }
        ? Body
        : never
    : never;

export type SignInWithAppleBody = JsonRequest<'/v1/auth/apple', 'post'>;
export type SignInWithGoogleBody = JsonRequest<'/v1/auth/google', 'post'>;
export type SignInResponse = JsonResponse<'/v1/auth/google', 'post', 200>;
export type MeResponse = JsonResponse<'/v1/me', 'get', 200>;
export type UpdateMeBody = JsonRequest<'/v1/me', 'patch'>;
export type DeleteMeResponse = JsonResponse<'/v1/me', 'delete', 202>;
export type RegisterDeviceBody = JsonRequest<'/v1/devices', 'post'>;
export type UpdateDeviceBody = JsonRequest<'/v1/devices/{anonymous_id}', 'patch'>;
export type DeviceResponse = JsonResponse<'/v1/devices', 'post', 201>;
export type HealthResponse = JsonResponse<'/v1/health', 'get', 200>;

// The query string of one GET operation: QueryParams<'/v1/events', 'get'>.
export type QueryParams<P extends ApiPath, M extends keyof paths[P]> =
  Operation<P, M> extends { parameters: { query?: infer Q } } ? NonNullable<Q> : never;

export type EventsListQuery = QueryParams<'/v1/events', 'get'>;
export type EventsListResponse = JsonResponse<'/v1/events', 'get', 200>;
export type EventsMapQuery = QueryParams<'/v1/events/map', 'get'>;
export type EventsMapResponse = JsonResponse<'/v1/events/map', 'get', 200>;
export type EventResponse = JsonResponse<'/v1/events/{slug}', 'get', 200>;
export type EventQuery = QueryParams<'/v1/events/{slug}', 'get'>;
export type EventOccurrencesQuery = QueryParams<'/v1/events/{id}/occurrences', 'get'>;
export type EventOccurrencesResponse = JsonResponse<'/v1/events/{id}/occurrences', 'get', 200>;
export type OccurrenceResponse = JsonResponse<'/v1/occurrences/{id}', 'get', 200>;
export type ClubsQuery = QueryParams<'/v1/clubs', 'get'>;
export type ClubsResponse = JsonResponse<'/v1/clubs', 'get', 200>;
export type ClubResponse = JsonResponse<'/v1/clubs/{slug}', 'get', 200>;
export type ClubEventsQuery = QueryParams<'/v1/clubs/{slug}/events', 'get'>;
export type ClubEventsResponse = JsonResponse<'/v1/clubs/{slug}/events', 'get', 200>;
export type ClubMembersQuery = QueryParams<'/v1/clubs/{slug}/members', 'get'>;
export type ClubMembersResponse = JsonResponse<'/v1/clubs/{slug}/members', 'get', 200>;
export type SponsorsQuery = QueryParams<'/v1/sponsors', 'get'>;
export type SponsorsResponse = JsonResponse<'/v1/sponsors', 'get', 200>;
export type SponsorResponse = JsonResponse<'/v1/sponsors/{slug}', 'get', 200>;
export type SponsorEventsQuery = QueryParams<'/v1/sponsors/{slug}/events', 'get'>;
export type SponsorEventsResponse = JsonResponse<'/v1/sponsors/{slug}/events', 'get', 200>;
export type UserResponse = JsonResponse<'/v1/users/{handle}', 'get', 200>;
export type UserEventsQuery = QueryParams<'/v1/users/{handle}/events', 'get'>;
export type UserEventsResponse = JsonResponse<'/v1/users/{handle}/events', 'get', 200>;
export type UserClubsResponse = JsonResponse<'/v1/users/{handle}/clubs', 'get', 200>;
