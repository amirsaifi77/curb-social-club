import '@/lib/unistyles';

import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { auth } from '@/lib/auth';
import { getDeviceId } from '@/lib/device-id';
import { registerDevice } from '@/lib/devices';
import { initSentry, wrapWithSentry } from '@/lib/sentry';

initSentry();
SplashScreen.preventAutoHideAsync();

function RootLayout() {
  // The four subset families from packages/design-tokens/fonts (R-11).
  // Instrument Serif Italic deliberately never ships.
  const [fontsLoaded] = useFonts({
    'InstrumentSerif-Regular': require('@curb/design-tokens/fonts/InstrumentSerif-Regular.ttf'),
    'Geist-Regular': require('@curb/design-tokens/fonts/Geist-Regular.ttf'),
    'Geist-Medium': require('@curb/design-tokens/fonts/Geist-Medium.ttf'),
    'Geist-SemiBold': require('@curb/design-tokens/fonts/Geist-SemiBold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  // Once per launch: hydrate the session (R-25) and register the device.
  useEffect(() => {
    void auth.hydrate();
    void registerDevice(auth.client, getDeviceId());
  }, []);

  if (!fontsLoaded) return null;

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="settings/index" options={{ title: 'Settings' }} />
      <Stack.Screen name="settings/delete-account" options={{ title: 'Delete account' }} />
      <Stack.Screen
        name="sign-in"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: 'fitToContents',
          sheetGrabberVisible: true,
          headerShown: false,
        }}
      />
      <Stack.Screen name="dev/gallery" options={{ title: 'Gallery' }} />
    </Stack>
  );
}

// Sentry's wrapper adds the touch event boundary and the profiler around
// the root; navigation breadcrumbs need the navigation integration later.
export default wrapWithSentry(RootLayout);
