import * as SecureStore from 'expo-secure-store';

// The opaque session token lives in the Keychain under curb.session (R-24).
export const SESSION_TOKEN_KEY = 'curb.session';

export interface TokenStore {
  get(): Promise<string | null>;
  set(token: string): Promise<void>;
  clear(): Promise<void>;
}

export const secureTokenStore: TokenStore = {
  get: () => SecureStore.getItemAsync(SESSION_TOKEN_KEY),
  set: (token) => SecureStore.setItemAsync(SESSION_TOKEN_KEY, token),
  clear: () => SecureStore.deleteItemAsync(SESSION_TOKEN_KEY),
};
