import { api, type ApiClient, type RegisterDeviceBody } from '@curb/api-client';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

// POST /v1/devices on launch (R-18): platform, app version, timezone. Push
// tokens and the home area arrive with their specs.
export function deviceRegistration(deviceId: string): RegisterDeviceBody {
  return {
    anonymous_id: deviceId,
    platform: Platform.OS === 'android' ? 'android' : Platform.OS === 'web' ? 'web' : 'ios',
    app_version: Application.nativeApplicationVersion ?? '0.0.0',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

export async function registerDevice(client: ApiClient, deviceId: string): Promise<void> {
  try {
    await api.devices.register(client, deviceRegistration(deviceId));
  } catch {
    // Offline at launch; the next launch retries.
  }
}
