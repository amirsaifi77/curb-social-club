import '@/lib/unistyles';

import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
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

  if (!fontsLoaded) return null;

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      <Stack.Screen name="dev/gallery" options={{ title: 'Gallery' }} />
    </Stack>
  );
}
