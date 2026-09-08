import { Stack } from 'expo-router';

import { SearchHeader } from '@/features/search/SearchHeader';

// The Map tab owns a stack so S03 can carry the native search field that
// opens S05 (discovery R-20). The header is transparent and carries no
// title: the map fills the screen under it (mobile-liquid-glass section 6).
export default function MapLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: '',
          headerTransparent: true,
          headerShadowVisible: false,
          ...SearchHeader,
        }}
      />
    </Stack>
  );
}
