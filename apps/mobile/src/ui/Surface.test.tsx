// Registers the Unistyles themes before Surface reads one.
import '@/lib/unistyles';

import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Text } from 'react-native';

import { Surface, SurfaceGroup } from './Surface';

// docs/specs/design-system-and-theming.md R-14 and the three tiers in
// docs/mobile-liquid-glass.md section 4. Every tier keeps the same layout,
// so a screen differs in material only.
describe('Surface', () => {
  it('R-14: renders real glass where the system has it', async () => {
    jest.mocked(isLiquidGlassAvailable).mockReturnValue(true);

    await render(
      <Surface material="glass">
        <Text>Chip</Text>
      </Surface>,
    );

    expect(screen.getByTestId('glass')).toBeTruthy();
    expect(screen.getByText('Chip')).toBeTruthy();
  });

  it('R-14: falls back to blur where glass is unavailable, keeping the content', async () => {
    jest.mocked(isLiquidGlassAvailable).mockReturnValue(false);

    await render(
      <Surface material="glass">
        <Text>Chip</Text>
      </Surface>,
    );

    expect(screen.queryByTestId('glass')).toBeNull();
    expect(screen.getByTestId('blur')).toBeTruthy();
    expect(screen.getByText('Chip')).toBeTruthy();
  });

  it('R-15: a solid surface is a solid surface on every tier', async () => {
    jest.mocked(isLiquidGlassAvailable).mockReturnValue(true);

    await render(
      <Surface>
        <Text>Row</Text>
      </Surface>,
    );

    expect(screen.queryByTestId('glass')).toBeNull();
    expect(screen.queryByTestId('blur')).toBeNull();
    expect(screen.getByText('Row')).toBeTruthy();
  });

  it('groups neighbouring glass, and is a plain row without it', async () => {
    jest.mocked(isLiquidGlassAvailable).mockReturnValue(true);
    await render(
      <SurfaceGroup>
        <Text>One</Text>
      </SurfaceGroup>,
    );
    expect(screen.getByTestId('glass-container')).toBeTruthy();

    jest.mocked(isLiquidGlassAvailable).mockReturnValue(false);
    await render(
      <SurfaceGroup>
        <Text>One</Text>
      </SurfaceGroup>,
    );
    expect(screen.queryByTestId('glass-container')).toBeNull();
    expect(screen.getByText('One')).toBeTruthy();
  });
});
