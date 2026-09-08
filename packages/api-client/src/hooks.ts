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
} from '@curb/types';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from './keys';
import { useApiClient } from './provider';
import {
  clubEventsQuery,
  clubMembersInfiniteQuery,
  clubMembersQuery,
  clubQuery,
  deleteAccountMutation,
  eventOccurrencesQuery,
  eventQuery,
  occurrenceQuery,
  eventsInfiniteQuery,
  eventsMapQuery,
  eventsQuery,
  feedQuery,
  healthQuery,
  meQuery,
  profileClubsQuery,
  profileEventsQuery,
  profileQuery,
  registerDeviceMutation,
  searchClubsQuery,
  searchEventsQuery,
  searchSponsorsQuery,
  signInWithAppleMutation,
  signInWithGoogleMutation,
  signOutMutation,
  sponsorEventsQuery,
  sponsorQuery,
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

// The filtered list behind "See all meets". A host's meets are a list, not
// a viewport, so this one pages.
export function useEventsPages(query: EventsListQuery = {}, limit?: number) {
  return useInfiniteQuery(eventsInfiniteQuery(useApiClient(), query, limit));
}

// S08 by slug. A 410 or 404 is a final answer with a body the screen needs
// (R-20), so it is not retried and the error carries through.
export function useEvent(slug: string, query: EventQuery = {}, options: { enabled?: boolean } = {}) {
  return useQuery({ ...eventQuery(useApiClient(), slug, query), ...options });
}

export function useOccurrence(id: string, options: { enabled?: boolean } = {}) {
  return useQuery({ ...occurrenceQuery(useApiClient(), id), ...options });
}

export function useEventOccurrences(
  eventId: string,
  query: EventOccurrencesQuery = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({ ...eventOccurrencesQuery(useApiClient(), eventId, query), ...options });
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

// The host pages: S12, S13, S14, S11. Each takes the slug or handle the
// route carries, and `enabled` is the caller's when a param can be missing.

export function useClub(slug: string, options: { enabled?: boolean } = {}) {
  return useQuery({ ...clubQuery(useApiClient(), slug), ...options });
}

export function useClubEvents(
  slug: string,
  query: ClubEventsQuery = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({ ...clubEventsQuery(useApiClient(), slug, query), ...options });
}

export function useClubMembers(
  slug: string,
  query: ClubMembersQuery = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({ ...clubMembersQuery(useApiClient(), slug, query), ...options });
}

// S13 pages through the members; S12's row wants one page and whether it
// is the whole club, which useClubMembers answers directly.
export function useClubMembersPages(slug: string, limit?: number) {
  return useInfiniteQuery(clubMembersInfiniteQuery(useApiClient(), slug, limit));
}

export function useSponsor(slug: string, options: { enabled?: boolean } = {}) {
  return useQuery({ ...sponsorQuery(useApiClient(), slug), ...options });
}

export function useSponsorEvents(
  slug: string,
  query: SponsorEventsQuery = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({ ...sponsorEventsQuery(useApiClient(), slug, query), ...options });
}

export function useProfile(handle: string, options: { enabled?: boolean } = {}) {
  return useQuery({ ...profileQuery(useApiClient(), handle), ...options });
}

export function useProfileEvents(
  handle: string,
  query: UserEventsQuery = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({ ...profileEventsQuery(useApiClient(), handle, query), ...options });
}

export function useProfileClubs(handle: string, options: { enabled?: boolean } = {}) {
  return useQuery({ ...profileClubsQuery(useApiClient(), handle), ...options });
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
