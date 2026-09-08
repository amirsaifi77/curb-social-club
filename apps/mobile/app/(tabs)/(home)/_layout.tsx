import { Stack } from 'expo-router';

import { SearchHeader } from '@/features/search/SearchHeader';

// The Home tab owns a stack so S02 gets a native header rather than one
// title shared by all four tabs. Large title in the serif, and no
// `headerStyle` background: on iOS 26 the system draws the glass
// (docs/mobile-liquid-glass.md section 6).
export default function HomeLayout() {
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'curb',
          headerLargeTitleStyle: { fontFamily: 'InstrumentSerif-Regular' },
          ...SearchHeader,
        }}
      />
    </Stack>
  );
}
