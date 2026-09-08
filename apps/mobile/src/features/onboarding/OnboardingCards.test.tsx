// Registers the Unistyles themes before StyleSheet.create runs.
import '@/lib/unistyles';

import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { ONBOARDING_COPY } from './copy';
import { OnboardingCards } from './OnboardingCards';

import { DEFAULT_AREA } from '@/lib/browse-location';

// jest.mock factories may only reach names prefixed with `mock`.
const mockPermission = jest.fn<() => Promise<{ granted: boolean }>>(async () => ({
  granted: true,
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: () => mockPermission(),
  getCurrentPositionAsync: async () => ({ coords: { latitude: 33.62, longitude: -117.93 } }),
  geocodeAsync: async () => [],
  Accuracy: { Lowest: 1 },
}));

// docs/specs/discovery.md R-10, R-11, AC-8, AC-9.
describe('OnboardingCards', () => {
  it('AC-8: Skip on every card lands on the default region', async () => {
    const onFinish = jest.fn();
    await render(<OnboardingCards onFinish={onFinish} />);

    await fireEvent.press(screen.getByText(ONBOARDING_COPY.skip));
    expect(screen.getByText(ONBOARDING_COPY.cardTwo)).toBeTruthy();

    await fireEvent.press(screen.getByText(ONBOARDING_COPY.skip));
    expect(screen.getByText(ONBOARDING_COPY.cardThree)).toBeTruthy();

    await fireEvent.press(screen.getByText(ONBOARDING_COPY.skip));
    expect(onFinish).toHaveBeenCalledWith({
      area: { ...DEFAULT_AREA, source: 'default' },
      interests: [],
    });
  });

  it('AC-9: the explainer is on screen before the button that asks', async () => {
    await render(<OnboardingCards onFinish={jest.fn()} />);
    await fireEvent.press(screen.getByText('Next'));

    expect(screen.getByText(ONBOARDING_COPY.explainer)).toBeTruthy();
    expect(screen.getByText(ONBOARDING_COPY.useMyLocation)).toBeTruthy();
    expect(mockPermission).not.toHaveBeenCalled();
  });

  it('R-11: a denied prompt offers the city search rather than dead-ending', async () => {
    mockPermission.mockResolvedValue({ granted: false });
    await render(<OnboardingCards onFinish={jest.fn()} />);
    await fireEvent.press(screen.getByText('Next'));

    await fireEvent.press(screen.getByText(ONBOARDING_COPY.useMyLocation));

    expect(await screen.findByText(ONBOARDING_COPY.denied)).toBeTruthy();
    expect(screen.getByLabelText('City name')).toBeTruthy();
  });

  it('R-4: interests are collected and handed to the caller', async () => {
    const onFinish = jest.fn();
    await render(<OnboardingCards onFinish={onFinish} />);
    await fireEvent.press(screen.getByText('Next'));
    await fireEvent.press(screen.getByText(ONBOARDING_COPY.skip));

    await fireEvent.press(screen.getByText('jdm'));
    await fireEvent.press(screen.getByText(ONBOARDING_COPY.done));

    expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({ interests: ['jdm'] }));
  });
});
