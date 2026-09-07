import { createMMKV, type MMKV } from 'react-native-mmkv';

// One app-wide MMKV instance; read synchronously before first render (R-9).
export const storage: MMKV = createMMKV();

export interface KeyValueStore {
  set(key: string, value: string): void;
  getString(key: string): string | undefined;
}
