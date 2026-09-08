import type {
  ClubsQuery,
  EventsListQuery,
  EventsMapQuery,
  FeedQuery,
  SponsorsQuery,
} from '@curb/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from './keys';
import { useApiClient } from './provider';
import {
  deleteAccountMutation,
  eventsMapQuery,
  eventsQuery,
  feedQuery,
  healthQuery,
  meQuery,
  registerDeviceMutation,
  searchClubsQuery,
  searchEventsQuery,
  searchSponsorsQuery,
  signInWithAppleMutation,
  signInWithGoogleMutation,
  signOutMutation,
  updateDeviceMutation,
  updateMeMutation,
} from './queries';

// Client-side hooks over the option factories. Sign-in and profile writes
// update the me cache in place; sign-out and delete drop it. A mounted
// useMe observer refetches after the drop and gets a 401 (which the client
// reports through onUnauthorized), so screens that stay mounted across a
// sign-out pass useMe({ enabled: signedIn }).

export function useHealth() {
  return useQuery(healthQuery(useApiClient()));
}

export function useMe(options: { enabled?: boolean } = {}) {
  return useQuery({ ...meQuery(useApiClient()), ...options });
}

// `enabled` is false until the browse area is known, so the feed is never
// fetched without a `near` the caller has already rounded (discovery R-1).
export function useFeed(query: FeedQuery = {}, options: { enabled?: boolean } = {}) {
  return useQuery({ ...feedQuery(useApiClient(), query), ...options });
}

// R-15: S03 decides when a box is worth a request, so `enabled` is false
// until the region has settled and the pill has been tapped.
export function useEventsMap(query: EventsMapQuery, options: { enabled?: boolean } = {}) {
  return useQuery({ ...eventsMapQuery(useApiClient(), query), ...options });
}

// R-18: the sheet's list, filtered and sorted the same way as the pins.
export function useEvents(query: EventsListQuery = {}, options: { enabled?: boolean } = {}) {
  return useQuery({ ...eventsQuery(useApiClient(), query), ...options });
}

// R-20: one request per group, each switched off until the debounce says
// the query is worth making.
export function useSearchEvents(query: EventsListQuery, options: { enabled?: boolean } = {}) {
  return useQuery({ ...searchEventsQuery(useApiClient(), query), ...options });
}

export function useSearchClubs(query: ClubsQuery, options: { enabled?: boolean } = {}) {
  return useQuery({ ...searchClubsQuery(useApiClient(), query), ...options });
}

export function useSearchSponsors(query: SponsorsQuery, options: { enabled?: boolean } = {}) {
  return useQuery({ ...searchSponsorsQuery(useApiClient(), query), ...options });
}

export function useSignInWithApple() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    ...signInWithAppleMutation(client),
    onSuccess: (response) => queryClient.setQueryData(queryKeys.me(), response.data.user),
  });
}

export function useSignInWithGoogle() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    ...signInWithGoogleMutation(client),
    onSuccess: (response) => queryClient.setQueryData(queryKeys.me(), response.data.user),
  });
}

export function useSignOut() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    ...signOutMutation(client),
    onSettled: () => queryClient.removeQueries({ queryKey: queryKeys.me() }),
  });
}

export function useUpdateMe() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    ...updateMeMutation(client),
    onSuccess: (user) => queryClient.setQueryData(queryKeys.me(), user),
  });
}

export function useDeleteAccount() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    ...deleteAccountMutation(client),
    onSuccess: () => queryClient.removeQueries({ queryKey: queryKeys.me() }),
  });
}

export function useRegisterDevice() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    ...registerDeviceMutation(client),
    onSuccess: (device) => queryClient.setQueryData(queryKeys.device(device.anonymous_id), device),
  });
}

export function useUpdateDevice() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    ...updateDeviceMutation(client),
    onSuccess: (device) => queryClient.setQueryData(queryKeys.device(device.anonymous_id), device),
  });
}
