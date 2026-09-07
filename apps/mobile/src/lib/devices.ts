import type { ApiClient } from '@curb/api-client';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

// POST /v1/devices on launch (R-18): platform, app version, timezone. Push
// tokens and the home area arrive with their specs.
export async function registerDevice(client: ApiClient, deviceId: string): Promise<void> {
  const platform = Platform.OS === 'android' ? 'android' : Platform.OS === 'web' ? 'web' : 'ios';
  try {
    await client.POST('/v1/devices', {
      body: {
        anonymous_id: deviceId,
        platform,
        app_version: Application.nativeApplicationVersion ?? '0.0.0',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    });
  } catch {
    // Offline at launch; the next launch retries.
  }
}
