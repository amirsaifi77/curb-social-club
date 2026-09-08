import { INTERESTS, INTEREST_STORAGE_KEY } from './copy';

import { storage, type KeyValueStore } from '@/lib/storage';


export const ONBOARDING_STORAGE_KEY = 'curb.onboarded';

export type Interest = (typeof INTERESTS)[number];

export function hasOnboarded(store: KeyValueStore = storage): boolean {
  return store.getString(ONBOARDING_STORAGE_KEY) === 'true';
}

export function markOnboarded(store: KeyValueStore = storage): void {
  store.set(ONBOARDING_STORAGE_KEY, 'true');
}

// R-4: on the device only. Nothing reads these into a query in Phase 1.
export function readInterests(store: KeyValueStore = storage): Interest[] {
  try {
    const raw = store.getString(INTEREST_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is Interest =>
      (INTERESTS as readonly string[]).includes(value as string),
    );
  } catch {
    return [];
  }
}

export function writeInterests(interests: Interest[], store: KeyValueStore = storage): void {
  store.set(INTEREST_STORAGE_KEY, JSON.stringify(interests));
}
