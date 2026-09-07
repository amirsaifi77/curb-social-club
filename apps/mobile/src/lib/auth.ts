// The app's auth store instance: Keychain token, MMKV device id, native
// providers, and the sign-in sheet as the gate (R-21, R-24).
import { router } from 'expo-router';

import { createAuthStore } from './auth-store';
import { getDeviceId } from './device-id';
import { signInWithAppleNative } from './providers/apple';
import { signInWithGoogleNative } from './providers/google';
import { secureTokenStore } from './session-token';
import { storage } from './storage';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export const auth = createAuthStore({
  baseUrl: API_URL,
  tokenStore: secureTokenStore,
  cache: storage,
  deviceId: getDeviceId,
  providers: { apple: signInWithAppleNative, google: signInWithGoogleNative },
  openSignIn: () => router.push('/sign-in'),
});

export const useAuth = auth.useAuth;
