// Registers the Unistyles themes before PrimaryButton's StyleSheet.create runs.
import '@/lib/unistyles';

import { getTheme } from '@curb/design-tokens';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import { PrimaryButton, type PrimaryButtonStatus } from './PrimaryButton';

type Node =
  { type?: string; props?: Record<string, unknown>; children?: Node[] | null } | string | null;

// Depth-first search of the rendered tree for a host node matching predicate.
function findNode(
  node: Node | Node[],
  predicate: (
    props: Record<string, unknown>,
    type: string | undefined,
    children: Node[],
  ) => boolean,
): Node | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findNode(child, predicate);
      if (found) return found;
    }
    return null;
  }
  if (!node || typeof node === 'string') return null;
  if (node.props && predicate(node.props, node.type, node.children ?? [])) return node;
  return findNode(node.children ?? [], predicate);
}

// AC-11 and AC-12 (design-system-and-theming.md): every controlled status in
// Marine Layer light and Harbor dark, busy and disabled accessibility state,
// and the reduced-motion set.

const STATUSES: PrimaryButtonStatus[] = [
  'idle',
  'loading',
  'longRunning',
  'confirmed',
  'going',
  'error',
  'queued',
  'disabled',
];

const THEMES = {
  'marine-layer light': getTheme('marine-layer', 'light'),
  'harbor dark': getTheme('harbor', 'dark'),
};

describe('PrimaryButton', () => {
  describe.each(Object.entries(THEMES))('in %s', (_name, colors) => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it.each(STATUSES)('renders %s', async (status) => {
      await render(
        <PrimaryButton
          label="I'm going"
          status={status}
          colors={colors}
          reduceMotion={false}
          stages={status === 'longRunning' ? ['Reading link', 'Finding the date'] : undefined}
          showProgress={status === 'longRunning'}
          disabledReason="Ended"
        />,
      );
      // Settle every finite animation (fades, the spring, the check draw) on
      // the fake clock so the tree is the same on every machine.
      await act(async () => {
        await jest.advanceTimersByTimeAsync(1_000);
      });
      expect(screen.toJSON()).toMatchSnapshot();
    });
  });

  it('reports busy for loading and long running, and the reason when disabled (AC-11)', async () => {
    const { rerender } = await render(
      <PrimaryButton label="I'm going" status="loading" reduceMotion={false} />,
    );
    expect(screen.getByRole('button').props.accessibilityState).toEqual({
      busy: true,
      disabled: false,
    });

    await rerender(
      <PrimaryButton
        label="I'm going"
        status="longRunning"
        stages={['Reading link']}
        reduceMotion={false}
      />,
    );
    expect(screen.getByRole('button').props.accessibilityState.busy).toBe(true);
    expect(screen.getByText('Reading link')).toBeTruthy();

    await rerender(<PrimaryButton label="I'm going" status="idle" reduceMotion={false} />);
    expect(screen.getByRole('button').props.accessibilityState.busy).toBe(false);

    await rerender(
      <PrimaryButton
        label="I'm going"
        status="disabled"
        disabledReason="Ended"
        reduceMotion={false}
      />,
    );
    expect(screen.getByRole('button').props.accessibilityState).toEqual({
      busy: false,
      disabled: true,
    });
    expect(screen.getByText('Ended')).toBeTruthy();
    expect(screen.getByRole('button').props.accessibilityLabel).toBe('Ended');
  });

  it('reads its colors from the Unistyles theme when no override is given', async () => {
    await render(<PrimaryButton label="I'm going" status="idle" reduceMotion={false} />);
    const fill = findNode(screen.toJSON() as Node, (props) => {
      const flat = StyleSheet.flatten(props.style as never) as { height?: number } | undefined;
      return flat?.height === 52;
    });
    const flat = StyleSheet.flatten(
      (fill as Exclude<Node, string | null>).props?.style as never,
    ) as {
      backgroundColor?: string;
    };
    expect(flat.backgroundColor).toBe(getTheme('marine-layer', 'light').accent);
  });

  it('keeps the stage copy visible in the long-running state, with the indicator under Reduce Motion', async () => {
    jest.useFakeTimers();
    try {
      const { rerender } = await render(
        <PrimaryButton
          label="Import"
          status="longRunning"
          stages={['Reading link']}
          reduceMotion={false}
        />,
      );
      // Let the ring fade in, then no wrapper with children may be faded out
      // (the childless pressed tint is the only opacity-0 node).
      await act(async () => {
        await jest.advanceTimersByTimeAsync(1_000);
      });
      // Reanimated's jest mock keeps the live value in jestAnimatedStyle.
      const hidden = findNode(screen.toJSON() as Node, (props, _type, children) => {
        const live = (props.jestAnimatedStyle as { value?: { opacity?: number } } | undefined)
          ?.value;
        const flat = StyleSheet.flatten(props.style as never) as { opacity?: number } | undefined;
        const opacity = live?.opacity ?? flat?.opacity;
        return opacity === 0 && children.length > 0;
      });
      expect(hidden).toBeNull();
      expect(screen.getByText('Reading link')).toBeTruthy();
      expect(screen.getByTestId('primary-button-ring')).toBeTruthy();

      await rerender(
        <PrimaryButton
          label="Import"
          status="longRunning"
          stages={['Reading link']}
          reduceMotion
        />,
      );
      expect(screen.getByText('Reading link')).toBeTruthy();
      expect(screen.queryByTestId('primary-button-ring')).toBeNull();
      expect(
        findNode(screen.toJSON() as Node, (_props, type) => type === 'ActivityIndicator'),
      ).not.toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('shows the going label with the leading check and the error caption', async () => {
    const { rerender } = await render(
      <PrimaryButton label="I'm going" status="going" reduceMotion={false} />,
    );
    expect(screen.getByText('Going')).toBeTruthy();

    await rerender(<PrimaryButton label="I'm going" status="error" reduceMotion={false} />);
    expect(screen.getByText('Try again')).toBeTruthy();
    expect(screen.getByText("Couldn't save. Check your connection.")).toBeTruthy();

    await rerender(<PrimaryButton label="I'm going" status="queued" reduceMotion={false} />);
    expect(
      screen.getByText("Saved on this phone. Will sync when you're back online."),
    ).toBeTruthy();
  });

  describe('uncontrolled', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it('runs the state machine from a tap: loading after the delay, confirmed, then going (R-16, R-17)', async () => {
      const onPress = jest.fn(() => new Promise<void>((resolve) => setTimeout(resolve, 200)));
      await render(<PrimaryButton label="I'm going" onPress={onPress} reduceMotion={false} />);

      await fireEvent(screen.getByRole('button'), 'pressIn');
      await fireEvent.press(screen.getByRole('button'));
      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onPress).toHaveBeenCalledWith({ removing: false });
      expect(Haptics.impactAsync).toHaveBeenCalled();

      // A second tap inside the delay window, before loading shows, is ignored.
      await act(async () => {
        await jest.advanceTimersByTimeAsync(100);
      });
      await fireEvent.press(screen.getByRole('button'));
      expect(onPress).toHaveBeenCalledTimes(1);

      await act(async () => {
        await jest.advanceTimersByTimeAsync(50);
      });
      expect(screen.getByRole('button').props.accessibilityState.busy).toBe(true);
      expect(screen.getByTestId('primary-button-ring')).toBeTruthy();

      // A tap while loading is ignored.
      await fireEvent.press(screen.getByRole('button'));
      expect(onPress).toHaveBeenCalledTimes(1);

      await act(async () => {
        await jest.advanceTimersByTimeAsync(400);
      });
      expect(screen.getByTestId('primary-button-check')).toBeTruthy();
      expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
      // Negative control for AC-12: with motion on, the check starts undrawn
      // (its animated dash offset at the full length).
      const animatedPath = findNode(
        screen.toJSON() as Node,
        (props) => Array.isArray(props.strokeDasharray) && props.strokeDasharray[0] === 17,
      ) as Exclude<Node, string | null>;
      expect(animatedPath.props?.strokeDashoffset).toBe(17);

      await act(async () => {
        await jest.advanceTimersByTimeAsync(600);
      });
      expect(screen.getByText('Going')).toBeTruthy();
    });

    it('hands the removal to onGoingPress and passes removing to onPress', async () => {
      const onPress = jest.fn(() => Promise.resolve());
      const onGoingPress = jest.fn((remove: () => void) => remove());
      await render(
        <PrimaryButton
          label="I'm going"
          onPress={onPress}
          onGoingPress={onGoingPress}
          reduceMotion={false}
        />,
      );
      await fireEvent.press(screen.getByRole('button'));
      await act(async () => {
        await jest.advanceTimersByTimeAsync(700);
      });
      expect(screen.getByText('Going')).toBeTruthy();

      await fireEvent.press(screen.getByRole('button'));
      expect(onGoingPress).toHaveBeenCalledTimes(1);
      expect(onPress).toHaveBeenLastCalledWith({ removing: true });
      await act(async () => {
        await jest.advanceTimersByTimeAsync(10);
      });
      expect(screen.getByText("I'm going")).toBeTruthy();
    });

    it('does nothing on a Going tap without onGoingPress', async () => {
      const onPress = jest.fn(() => Promise.resolve());
      await render(<PrimaryButton label="I'm going" onPress={onPress} reduceMotion={false} />);
      await fireEvent.press(screen.getByRole('button'));
      await act(async () => {
        await jest.advanceTimersByTimeAsync(700);
      });
      await fireEvent.press(screen.getByRole('button'));
      expect(onPress).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Going')).toBeTruthy();
    });

    it('reads Reduce Motion from AccessibilityInfo when not overridden (AC-12)', async () => {
      jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
      const onPress = jest.fn(() => new Promise<void>((resolve) => setTimeout(resolve, 300)));
      await render(<PrimaryButton label="I'm going" onPress={onPress} />);
      await act(async () => {
        await Promise.resolve();
      });
      await fireEvent.press(screen.getByRole('button'));
      await act(async () => {
        await jest.advanceTimersByTimeAsync(150);
      });
      expect(screen.getByTestId('primary-button-saving')).toBeTruthy();
      expect(screen.queryByTestId('primary-button-ring')).toBeNull();
    });

    it('under Reduce Motion shows the Saving label with the activity indicator and no scale, and the check without drawing (AC-12)', async () => {
      const onPress = jest.fn(() => new Promise<void>((resolve) => setTimeout(resolve, 300)));
      await render(<PrimaryButton label="I'm going" onPress={onPress} reduceMotion />);

      await fireEvent(screen.getByRole('button'), 'pressIn');
      await fireEvent.press(screen.getByRole('button'));
      await act(async () => {
        await jest.advanceTimersByTimeAsync(150);
      });
      expect(screen.getByTestId('primary-button-saving')).toBeTruthy();
      expect(screen.getByText('Saving')).toBeTruthy();
      expect(screen.queryByTestId('primary-button-ring')).toBeNull();
      const fill = findNode(screen.toJSON() as Node, (props) => {
        const flat = StyleSheet.flatten(props.style as never) as { height?: number } | undefined;
        return flat?.height === 52;
      });
      expect(fill).not.toBeNull();
      const flat = StyleSheet.flatten(
        (fill as Exclude<Node, string | null>).props?.style as never,
      ) as {
        transform?: unknown[];
      };
      expect(flat.transform ?? []).toEqual([]);

      await act(async () => {
        await jest.advanceTimersByTimeAsync(400);
      });
      expect(screen.getByTestId('primary-button-check')).toBeTruthy();
      // react-native-svg's host node carries the dash array as [17, 17] and a
      // zero offset as null: the stroke is fully drawn from the first frame.
      const path = findNode(
        screen.toJSON() as Node,
        (props) => Array.isArray(props.strokeDasharray) && props.strokeDasharray[0] === 17,
      );
      expect(path).not.toBeNull();
      const pathProps = (path as Exclude<Node, string | null>).props ?? {};
      expect(pathProps.strokeDashoffset ?? 0).toBe(0);
      expect('jestAnimatedProps' in pathProps).toBe(false);
    });

    it('rotates stage copy and shows the progress bar only after two seconds (R-18, AC-14)', async () => {
      const onPress = jest.fn(() => new Promise<void>((resolve) => setTimeout(resolve, 6_000)));
      await render(
        <PrimaryButton
          label="Import"
          onPress={onPress}
          stages={['Reading link', 'Finding the date', 'Finding the place', 'Drafting your event']}
          reduceMotion={false}
        />,
      );
      await fireEvent.press(screen.getByRole('button'));
      await act(async () => {
        await jest.advanceTimersByTimeAsync(150);
      });
      expect(screen.getByText('Reading link')).toBeTruthy();
      expect(screen.queryByTestId('primary-button-progress')).toBeNull();

      await act(async () => {
        await jest.advanceTimersByTimeAsync(1_500);
      });
      expect(screen.getByText('Finding the date')).toBeTruthy();

      await act(async () => {
        await jest.advanceTimersByTimeAsync(400);
      });
      expect(screen.getByTestId('primary-button-progress')).toBeTruthy();

      await act(async () => {
        await jest.advanceTimersByTimeAsync(3_000);
      });
      expect(screen.getByText('Drafting your event')).toBeTruthy();

      await act(async () => {
        await jest.advanceTimersByTimeAsync(1_000);
      });
      expect(screen.getByTestId('primary-button-check')).toBeTruthy();
      expect(screen.getByTestId('primary-button-progress')).toBeTruthy();
    });

    it('shows no bar for a one second operation', async () => {
      const onPress = jest.fn(() => new Promise<void>((resolve) => setTimeout(resolve, 1_000)));
      await render(
        <PrimaryButton
          label="Import"
          onPress={onPress}
          stages={['Reading link']}
          reduceMotion={false}
        />,
      );
      await fireEvent.press(screen.getByRole('button'));
      await act(async () => {
        await jest.advanceTimersByTimeAsync(1_000);
      });
      expect(screen.queryByTestId('primary-button-progress')).toBeNull();
    });
  });
});
