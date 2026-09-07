import * as Crypto from 'expo-crypto';

import { storage, type KeyValueStore } from './storage';

// X-Device-Id: a UUID generated once and persisted in MMKV (R-24).
export const DEVICE_ID_KEY = 'curb.deviceId';

export function getDeviceId(
  store: KeyValueStore = storage,
  generate: () => string = () => Crypto.randomUUID(),
): string {
  const existing = store.getString(DEVICE_ID_KEY);
  if (existing) return existing;
  const id = generate();
  store.set(DEVICE_ID_KEY, id);
  return id;
}
