import { api, type ApiClient, type RegisterDeviceBody } from '@curb/api-client';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

import { readBrowseArea } from './browse-location';

// POST /v1/devices on launch (R-18): platform, app version, timezone, and
// the rounded home area when one is already stored (discovery R-2). Push
// tokens arrive with their spec.
export function deviceRegistration(deviceId: string): RegisterDeviceBody {
  const area = readBrowseArea();
  return {
    anonymous_id: deviceId,
    platform: Platform.OS === 'android' ? 'android' : Platform.OS === 'web' ? 'web' : 'ios',
    app_version: Application.nativeApplicationVersion ?? '0.0.0',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    ...(area ? { home_location: { lat: area.lat, lng: area.lng } } : {}),
  };
}

export async function registerDevice(client: ApiClient, deviceId: string): Promise<void> {
  try {
    await api.devices.register(client, deviceRegistration(deviceId));
  } catch {
    // Offline at launch; the next launch retries.
  }
}
