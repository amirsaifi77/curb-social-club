import type {
  RegisterDeviceBody,
  SignInWithAppleBody,
  SignInWithGoogleBody,
  UpdateDeviceBody,
  UpdateMeBody,
} from '@curb/types';
import { queryOptions } from '@tanstack/react-query';

import { ApiError, type ApiClient } from './client';
import { mutationKeys, queryKeys } from './keys';
import { api } from './requests';

// Option factories: usable with useQuery on the client and with
// queryClient.ensureQueryData in React Router loaders on the server.

// A 4xx answer is final; only network and 5xx failures retry.
function retryUnlessClientError(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status < 500) return false;
  return failureCount < 2;
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
