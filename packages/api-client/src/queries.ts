import type {
  ClubsQuery,
  EventsListQuery,
  EventsMapQuery,
  FeedQuery,
  SponsorsQuery,
  RegisterDeviceBody,
  SignInWithAppleBody,
  SignInWithGoogleBody,
  UpdateDeviceBody,
  UpdateMeBody,
} from '@curb/types';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';

import { ApiError, type ApiClient } from './client';
import { mutationKeys, queryKeys } from './keys';
import { api } from './requests';

// Option factories: usable with useQuery on the client and with
// queryClient.ensureQueryData in React Router loaders on the server.

// A 4xx answer is final; a network or 5xx failure retries once (the same
// as the app-level QueryClient default, so the two never disagree).
function retryUnlessClientError(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status < 500) return false;
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

// S05's three API groups (discovery R-20). One query each, so a group that
// fails or is slow does not hold up the others, and the screen renders
// whichever have arrived. `enabled` belongs to the caller: the debounce
// decides when a query is worth making.
export function searchEventsQuery(client: ApiClient, query: EventsListQuery) {
  return queryOptions({
    queryKey: queryKeys.events(query),
    queryFn: async () => api.events.list(client, query),
    staleTime: 30_000,
    retry: retryUnlessClientError,
  });
}

export function searchClubsQuery(client: ApiClient, query: ClubsQuery) {
  return queryOptions({
    queryKey: queryKeys.clubs(query),
    queryFn: async () => (await api.clubs.list(client, query)).data,
    staleTime: 30_000,
    retry: retryUnlessClientError,
  });
}

export function searchSponsorsQuery(client: ApiClient, query: SponsorsQuery) {
  return queryOptions({
    queryKey: queryKeys.sponsors(query),
    queryFn: async () => (await api.sponsors.list(client, query)).data,
    staleTime: 30_000,
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
