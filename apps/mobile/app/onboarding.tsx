import { router } from 'expo-router';

import { OnboardingCards } from '@/features/onboarding/OnboardingCards';
import { markOnboarded, writeInterests } from '@/features/onboarding/state';
import { setBrowseArea } from '@/lib/use-browse-location';

// S01 as a first-launch modal (docs/screens.md). Presented from the root
// layout, so a person picks an area before Home asks the API for one.
export default function OnboardingScreen() {
  return (
    <OnboardingCards
      onFinish={({ area, interests }) => {
        setBrowseArea(area);
        writeInterests(interests);
        markOnboarded();
        router.back();
      }}
    />
  );
}
