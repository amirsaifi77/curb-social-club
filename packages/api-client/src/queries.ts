import type {
  ClubEventsQuery,
  ClubMembersQuery,
  ClubsQuery,
  EventOccurrencesQuery,
  EventQuery,
  EventsListQuery,
  EventsMapQuery,
  FeedQuery,
  SponsorEventsQuery,
  SponsorsQuery,
  UserEventsQuery,
  RegisterDeviceBody,
  SignInWithAppleBody,
  SignInWithGoogleBody,
  UpdateDeviceBody,
  UpdateMeBody,
} from '@curb/types';
import { infiniteQueryOptions, keepPreviousData, queryOptions } from '@tanstack/react-query';

import { errorStatus, type ApiClient } from './client';
import { mutationKeys, queryKeys } from './keys';
import { firstPage, getNextPageParam, pageParams, type Cursor } from './pagination';
import { api } from './requests';

// Option factories: usable with useQuery on the client and with
// queryClient.ensureQueryData in React Router loaders on the server.

// A 4xx answer is final; a network or 5xx failure retries once (the same
// as the app-level QueryClient default, so the two never disagree).
function retryUnlessClientError(failureCount: number, error: unknown): boolean {
  const status = errorStatus(error);
  if (status !== null && status < 500) return false;
  return failureCount < 1;
}

export function healthQuery(client: ApiClient) {
  return queryOptions({
    queryKey: queryKeys.health(),
    queryFn: () => api.health.get(client),
    staleTime: 30_000,
    retry: retryUnlessClientError,
  });
}

export function meQuery(client: ApiClient) {
  return queryOptions({
    queryKey: queryKeys.me(),
    queryFn: async () => (await api.me.get(client)).data,
    staleTime: 60_000,
    retry: retryUnlessClientError,
  });
}

// The sectioned home feed (discovery R-5, R-12). Kept fresh for a minute:
// a section is a window on the next 90 days, so it does not move often, and
// the mobile persister replays the last one offline.
export function feedQuery(client: ApiClient, query: FeedQuery = {}) {
  return queryOptions({
    queryKey: queryKeys.feed(query),
    queryFn: async () => (await api.feed.get(client, query)).data,
    staleTime: 60_000,
    retry: retryUnlessClientError,
  });
}

export function signInWithAppleMutation(client: ApiClient) {
  return {
    mutationKey: mutationKeys.signInWithApple,
    mutationFn: (body: SignInWithAppleBody) => api.auth.apple(client, body),
  };
}

export function signInWithGoogleMutation(client: ApiClient) {
  return {
    mutationKey: mutationKeys.signInWithGoogle,
    mutationFn: (body: SignInWithGoogleBody) => api.auth.google(client, body),
  };
}

export function signOutMutation(client: ApiClient) {
  return {
    mutationKey: mutationKeys.signOut,
    mutationFn: () => api.auth.signOut(client),
  };
}

// Map pins for a viewport (discovery R-15). Kept fresh for a minute like
// the feed: pins move when occurrences do, not when the map does, and R-15
// already decides when a new box is worth a request.
export function eventsMapQuery(client: ApiClient, query: EventsMapQuery) {
  return queryOptions({
    queryKey: queryKeys.eventsMap(query),
    // The whole envelope: R-19's zoom-in notice comes from meta.truncated,
    // so unwrapping to data alone would throw it away.
    queryFn: async () => api.events.map(client, query),
    staleTime: 60_000,
    retry: retryUnlessClientError,
    // A new box is a new key. Without this the map blanks on every "search
    // this area" tap, and an offline tap loses the last pins the offline
    // state is supposed to keep showing (discovery R-15, Screens S03).
    placeholderData: keepPreviousData,
  });
}

// The sheet's list (discovery R-18). Same filters as the pins, plus the
// sort, so the pair answers one question about one viewport.
export function eventsQuery(client: ApiClient, query: EventsListQuery = {}) {
  return queryOptions({
    queryKey: queryKeys.events(query),
    queryFn: async () => api.events.list(client, query),
    staleTime: 60_000,
    retry: retryUnlessClientError,
    // The sheet keeps its rows while the next box loads, for the same
    // reason the pins do.
    placeholderData: keepPreviousData,
  });
}

// S04 filtered to one host or sponsor (clubs R-15, sponsors R-15). "See
// all meets" means all of them, so this pages rather than stopping at the
// first twenty the way a viewport list can afford to.
export function eventsInfiniteQuery(
  client: ApiClient,
  query: EventsListQuery = {},
  limit?: number,
) {
  return infiniteQueryOptions({
    queryKey: [...queryKeys.events(query), 'pages', limit ?? null] as const,
    queryFn: ({ pageParam }: { pageParam: Cursor }) =>
      api.events.list(client, { ...query, ...pageParams(pageParam, limit) }),
    initialPageParam: firstPage,
    getNextPageParam,
    staleTime: 60_000,
    retry: retryUnlessClientError,
  });
}

// S05's three API groups (discovery R-20). One query each, so a group that
// fails or is slow does not hold up the others, and the screen renders
// whichever have arrived. `enabled` belongs to the caller: the debounce
// decides when a query is worth making.
export function searchEventsQuery(client: ApiClient, query: EventsListQuery) {
  return queryOptions({
    queryKey: queryKeys.searchEvents(query),
    queryFn: async () => api.events.list(client, query),
    staleTime: 30_000,
    retry: retryUnlessClientError,
  });
}

export function searchClubsQuery(client: ApiClient, query: ClubsQuery) {
  return queryOptions({
    queryKey: queryKeys.searchClubs(query),
    queryFn: async () => (await api.clubs.list(client, query)).data,
    staleTime: 30_000,
    retry: retryUnlessClientError,
  });
}

export function searchSponsorsQuery(client: ApiClient, query: SponsorsQuery) {
  return queryOptions({
    queryKey: queryKeys.searchSponsors(query),
    queryFn: async () => (await api.sponsors.list(client, query)).data,
    staleTime: 30_000,
    retry: retryUnlessClientError,
  });
}

// S08 (event-detail-and-rsvp.md R-11). `token` unlocks an unlisted event
// and `near` fills the nearby list a 410 comes back with, so both belong in
// the key: the same slug answers differently with and without them.
export function eventQuery(client: ApiClient, slug: string, query: EventQuery = {}) {
  return queryOptions({
    queryKey: [...queryKeys.event(slug), query] as const,
    queryFn: async () => (await api.events.get(client, slug, query)).data,
    staleTime: 60_000,
    retry: retryUnlessClientError,
  });
}

// S09 by id, so a curb://occurrences/:id deep link has something to read
// rather than only the in-app path that already knows the date (R-25).
export function occurrenceQuery(client: ApiClient, id: string) {
  return queryOptions({
    queryKey: queryKeys.occurrence(id),
    queryFn: async () => (await api.occurrences.get(client, id)).data,
    staleTime: 60_000,
    retry: retryUnlessClientError,
  });
}

// R-12's "Next dates" rows.
export function eventOccurrencesQuery(
  client: ApiClient,
  eventId: string,
  query: EventOccurrencesQuery = {},
) {
  return queryOptions({
    queryKey: [...queryKeys.eventOccurrences(eventId), query] as const,
    queryFn: async () => (await api.events.occurrences(client, eventId, query)).data,
    staleTime: 60_000,
    retry: retryUnlessClientError,
  });
}

// The host pages (clubs R-15, sponsors R-15, profiles R-17). All three are
// public reads, so they answer the same without a token; a hidden club or
// sponsor and a missing handle are 404s the screen renders as a page, so
// they are not retried.

export function clubQuery(client: ApiClient, slug: string) {
  return queryOptions({
    queryKey: queryKeys.club(slug),
    queryFn: async () => (await api.clubs.get(client, slug)).data,
    staleTime: 60_000,
    retry: retryUnlessClientError,
  });
}

// S12 shows three; S04 filtered by `host=club:<id>` shows the rest.
export function clubEventsQuery(client: ApiClient, slug: string, query: ClubEventsQuery = {}) {
  return queryOptions({
    queryKey: queryKeys.clubEvents(slug, query),
    queryFn: async () => api.clubs.events(client, slug, query),
    staleTime: 60_000,
    retry: retryUnlessClientError,
  });
}

// S13. The whole envelope: the cursor in `meta` is what pages it.
export function clubMembersQuery(client: ApiClient, slug: string, query: ClubMembersQuery = {}) {
  return queryOptions({
    queryKey: queryKeys.clubMembers(slug, query),
    queryFn: async () => api.clubs.members(client, slug, query),
    staleTime: 60_000,
    retry: retryUnlessClientError,
  });
}

// S13's list. A club can outgrow one page, so the screen pages with the
// standard cursor rather than showing the first twenty and stopping.
export function clubMembersInfiniteQuery(client: ApiClient, slug: string, limit?: number) {
  return infiniteQueryOptions({
    queryKey: [...queryKeys.clubMembers(slug, {}), 'pages', limit ?? null] as const,
    queryFn: ({ pageParam }: { pageParam: Cursor }) =>
      api.clubs.members(client, slug, pageParams(pageParam, limit)),
    initialPageParam: firstPage,
    getNextPageParam,
    staleTime: 60_000,
    retry: retryUnlessClientError,
  });
}

export function sponsorQuery(client: ApiClient, slug: string) {
  return queryOptions({
    queryKey: queryKeys.sponsor(slug),
    queryFn: async () => (await api.sponsors.get(client, slug)).data,
    staleTime: 60_000,
    retry: retryUnlessClientError,
  });
}

export function sponsorEventsQuery(
  client: ApiClient,
  slug: string,
  query: SponsorEventsQuery = {},
) {
  return queryOptions({
    queryKey: queryKeys.sponsorEvents(slug, query),
    queryFn: async () => api.sponsors.events(client, slug, query),
    staleTime: 60_000,
    retry: retryUnlessClientError,
  });
}

export function profileQuery(client: ApiClient, handle: string) {
  return queryOptions({
    queryKey: queryKeys.user(handle),
    queryFn: async () => (await api.users.get(client, handle)).data,
    staleTime: 60_000,
    retry: retryUnlessClientError,
  });
}

export function profileEventsQuery(client: ApiClient, handle: string, query: UserEventsQuery = {}) {
  return queryOptions({
    queryKey: queryKeys.userEvents(handle, query),
    queryFn: async () => api.users.events(client, handle, query),
    staleTime: 60_000,
    retry: retryUnlessClientError,
  });
}

// The Profile shape carries `clubs`, but `role` is set only on this
// endpoint (docs/api.md ClubSummary), and R-17 asks for the Owner and Admin
// labels, so the section reads from here rather than from the profile.
export function profileClubsQuery(client: ApiClient, handle: string) {
  return queryOptions({
    queryKey: queryKeys.userClubs(handle),
    queryFn: async () => (await api.users.clubs(client, handle)).data,
    staleTime: 60_000,
    retry: retryUnlessClientError,
  });
}

export function updateMeMutation(client: ApiClient) {
  return {
    mutationKey: mutationKeys.updateMe,
    mutationFn: async (body: UpdateMeBody) => (await api.me.update(client, body)).data,
  };
}

export function deleteAccountMutation(client: ApiClient) {
  return {
    mutationKey: mutationKeys.deleteAccount,
    mutationFn: async () => (await api.me.destroy(client)).data,
  };
}

export function registerDeviceMutation(client: ApiClient) {
  return {
    mutationKey: mutationKeys.registerDevice,
    mutationFn: async (body: RegisterDeviceBody) => (await api.devices.register(client, body)).data,
  };
}

export function updateDeviceMutation(client: ApiClient) {
  return {
    mutationKey: mutationKeys.updateDevice,
    mutationFn: async (input: { anonymousId: string; body: UpdateDeviceBody }) =>
      (await api.devices.update(client, input.anonymousId, input.body)).data,
  };
}
