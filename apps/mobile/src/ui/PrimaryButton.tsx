import type { ThemeColors } from '@curb/design-tokens';
import { useAsyncAction, type AsyncActionStatus } from '@curb/ui';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Pressable,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Text } from './Text';
import { useReduceMotion } from './useReduceMotion';

// The primary CTA (docs/components/primary-cta.md, design-system-and-theming.md
// R-16, R-18). Controlled through `status`, or uncontrolled through an
// `onPress` that returns a promise, in which case the shared useAsyncAction
// machine drives idle, loading, confirmed, going, and error with the
// timings from motion.asyncButton. Every color comes from the theme (or the
// `colors` override the gallery and tests use) and every duration from
// motion.

export type PrimaryButtonStatus =
  'idle' | 'loading' | 'longRunning' | 'confirmed' | 'going' | 'error' | 'queued' | 'disabled';

export interface PrimaryButtonProps {
  label: string;
  goingLabel?: string;
  status?: PrimaryButtonStatus;
  onPress?: () => Promise<unknown> | void;
  // Tapping while going. Defaults to running onPress as a removal.
  onGoingPress?: () => void;
  // Long-running variant (R-18): copy rotated every stageInterval, and the
  // progress bar once the run is past stillWorkingAfter.
  stages?: readonly string[];
  disabledReason?: string;
  errorCaption?: string;
  queuedCaption?: string;
  stillWorkingCaption?: string;
  announcements?: { saving?: string; done?: string; failed?: string };
  colors?: ThemeColors;
  reduceMotion?: boolean;
  style?: ViewStyle;
  testID?: string;
}

const RING = 20;
const RING_STROKE = 1.5;
const RING_RADIUS = (RING - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const CHECK_PATH = 'M4.5 10.5 L8.5 14.5 L15.5 6';
const CHECK_LENGTH = 17;
const GOING_CHECK = 16;

const AnimatedPath = Animated.createAnimatedComponent(Path);

async function nothing(): Promise<void> {}

function machineToStatus(status: AsyncActionStatus, longRunning: boolean): PrimaryButtonStatus {
  if (status === 'loading') return longRunning ? 'longRunning' : 'loading';
  return status;
}

export function PrimaryButton({
  label,
  goingLabel = 'Going',
  status: controlledStatus,
  onPress,
  onGoingPress,
  stages,
  disabledReason,
  errorCaption = "Couldn't save. Check your connection.",
  queuedCaption = "Saved on this phone. Will sync when you're back online.",
  stillWorkingCaption = 'Still working',
  announcements,
  colors,
  reduceMotion: reduceMotionOverride,
  style,
  testID = 'primary-button',
}: PrimaryButtonProps) {
  const { theme } = useUnistyles();
  const palette = colors ?? theme.colors;
  const { motion } = theme;
  const reduceMotion = useReduceMotion(reduceMotionOverride);
  const action = useAsyncAction(async () => {
    await (onPress ?? nothing)();
  });
  const longRunning = (stages?.length ?? 0) > 0;
  const status = controlledStatus ?? machineToStatus(action.status, longRunning);
  const busy = status === 'loading' || status === 'longRunning';
  const showBar =
    status === 'longRunning' && (controlledStatus !== undefined || action.stillWorking);
  // The bar, once shown, stays through confirmed so it can reach 100 percent;
  // a run that finished under stillWorkingAfter never shows it (R-18).
  const [barShown, setBarShown] = useState(false);
  useEffect(() => {
    if (showBar) setBarShown(true);
    else if (status !== 'confirmed') setBarShown(false);
  }, [showBar, status]);
  const easing = Easing.bezier(0.2, 0, 0, 1);
  const fade = { duration: motion.duration.fade, easing };

  // Fill per status; pressed interpolates toward accentPressed.
  const baseFill =
    status === 'going' || status === 'queued'
      ? palette.surface
      : status === 'disabled'
        ? palette.border
        : palette.accent;
  const outlined = status === 'going' || status === 'queued';
  const labelColor = outlined
    ? palette.accent
    : status === 'disabled'
      ? palette.textSecondary
      : palette.accentInk;

  const pressed = useSharedValue(0);
  const labelOpacity = useSharedValue(1);
  const ringOpacity = useSharedValue(0);
  const rotation = useSharedValue(0);
  const draw = useSharedValue(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    const hideLabel = busy || status === 'confirmed';
    labelOpacity.value = withTiming(hideLabel ? 0 : 1, fade);
    if (busy && !reduceMotion) {
      ringOpacity.value = withDelay(60, withTiming(1, fade));
      rotation.value = withRepeat(
        withTiming(360, { duration: motion.duration.spin, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      ringOpacity.value = withTiming(0, fade);
      cancelAnimation(rotation);
      rotation.value = 0;
    }
    if (status === 'confirmed') {
      draw.value = reduceMotion
        ? 1
        : withDelay(60, withTiming(1, { duration: motion.duration.draw, easing }));
    } else {
      draw.value = 0;
    }
    // The stroke draws on over motion.duration.draw; nothing else reads it.
  }, [busy, status, reduceMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  // Progress bar (R-18): fast to 60 percent, slow to 90, full on completion.
  useEffect(() => {
    if (showBar) {
      progress.value = withSequence(
        withTiming(0.6, { duration: 3_000, easing }),
        withTiming(0.9, { duration: 12_000, easing: Easing.linear }),
      );
    } else if (status === 'confirmed') {
      progress.value = withTiming(1, { duration: motion.duration.settle, easing });
    } else {
      cancelAnimation(progress);
      progress.value = 0;
    }
  }, [showBar, status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stage copy rotation for the long-running variant.
  const [stageIndex, setStageIndex] = useState(0);
  useEffect(() => {
    if (status !== 'longRunning' || !stages || stages.length < 2) {
      setStageIndex(0);
      return;
    }
    const interval = setInterval(
      () => setStageIndex((index) => Math.min(index + 1, stages.length - 1)),
      motion.asyncButton.stageInterval,
    );
    return () => clearInterval(interval);
  }, [status, stages, motion.asyncButton.stageInterval]);

  // Haptics and VoiceOver on status changes.
  const previous = useRef<PrimaryButtonStatus>(status);
  useEffect(() => {
    if (previous.current === status) return;
    previous.current = status;
    if (status === 'confirmed') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      AccessibilityInfo.announceForAccessibility(announcements?.done ?? 'Done');
    } else if (status === 'error') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      AccessibilityInfo.announceForAccessibility(announcements?.failed ?? "Couldn't save");
    } else if (busy) {
      AccessibilityInfo.announceForAccessibility(announcements?.saving ?? 'Saving');
    }
  }, [status, busy, announcements]);

  const fillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(pressed.value, [0, 1], [baseFill, palette.accentPressed]),
    transform: reduceMotion
      ? []
      : [
          {
            scale: withSpring(pressed.value ? 0.98 : 1, {
              damping: motion.easing.spring.damping,
              stiffness: motion.easing.spring.stiffness,
              mass: motion.easing.spring.mass,
            }),
          },
        ],
  }));
  const labelStyle = useAnimatedStyle(() => ({ opacity: labelOpacity.value }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
  const checkProps = useAnimatedProps(() => ({
    strokeDashoffset: CHECK_LENGTH * (1 - draw.value),
  }));
  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  const interactive = !busy && status !== 'confirmed' && status !== 'disabled';

  function handlePress() {
    if (!interactive) return;
    if (status === 'going' && onGoingPress) {
      onGoingPress();
      return;
    }
    if (controlledStatus !== undefined) {
      void onPress?.();
      return;
    }
    action.run();
  }

  const visibleLabel =
    status === 'disabled'
      ? (disabledReason ?? label)
      : status === 'going' || status === 'queued'
        ? goingLabel
        : status === 'error'
          ? 'Try again'
          : status === 'longRunning'
            ? (stages?.[stageIndex] ?? label)
            : label;

  const caption =
    status === 'error'
      ? { text: errorCaption, tone: 'error' as const }
      : status === 'queued'
        ? { text: queuedCaption, tone: 'secondary' as const }
        : status === 'loading' && action.stillWorking && controlledStatus === undefined
          ? { text: stillWorkingCaption, tone: 'secondary' as const }
          : null;

  return (
    <View style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={visibleLabel}
        accessibilityState={{ busy, disabled: status === 'disabled' }}
        disabled={status === 'disabled'}
        onPressIn={() => {
          if (!interactive) return;
          pressed.value = 1;
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        onPressOut={() => {
          pressed.value = 0;
        }}
        onPress={handlePress}
        testID={testID}
      >
        <Animated.View
          style={[
            styles.button,
            outlined && { borderWidth: 1, borderColor: palette.accent },
            fillStyle,
          ]}
        >
          {status === 'going' || status === 'queued' ? (
            <Svg
              width={GOING_CHECK}
              height={GOING_CHECK}
              viewBox="0 0 20 20"
              style={styles.leading}
            >
              <Path
                d={CHECK_PATH}
                stroke={palette.accent}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
          ) : null}

          {reduceMotion && busy && status !== 'longRunning' ? (
            <View style={styles.row} testID="primary-button-saving">
              <ActivityIndicator size="small" color={palette.accentInk} />
              <Text variant="subhead" style={{ color: palette.accentInk }}>
                {announcements?.saving ?? 'Saving'}
              </Text>
            </View>
          ) : (
            <Animated.View style={labelStyle}>
              <Text variant="subhead" style={{ color: labelColor }} numberOfLines={1}>
                {visibleLabel}
              </Text>
            </Animated.View>
          )}

          {busy && !reduceMotion ? (
            <Animated.View
              style={[styles.overlay, ringStyle]}
              pointerEvents="none"
              testID="primary-button-ring"
            >
              <Svg width={RING} height={RING} viewBox={`0 0 ${RING} ${RING}`}>
                <Circle
                  cx={RING / 2}
                  cy={RING / 2}
                  r={RING_RADIUS}
                  stroke={palette.accentInk}
                  strokeOpacity={0.35}
                  strokeWidth={RING_STROKE}
                  fill="none"
                />
                <Circle
                  cx={RING / 2}
                  cy={RING / 2}
                  r={RING_RADIUS}
                  stroke={palette.accentInk}
                  strokeWidth={RING_STROKE}
                  strokeDasharray={`${RING_CIRCUMFERENCE / 4} ${RING_CIRCUMFERENCE}`}
                  strokeLinecap="round"
                  fill="none"
                />
              </Svg>
            </Animated.View>
          ) : null}

          {status === 'confirmed' ? (
            <View style={styles.overlay} pointerEvents="none" testID="primary-button-check">
              <Svg width={RING} height={RING} viewBox="0 0 20 20">
                {reduceMotion ? (
                  <Path
                    d={CHECK_PATH}
                    stroke={palette.accentInk}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    strokeDasharray={CHECK_LENGTH}
                    strokeDashoffset={0}
                  />
                ) : (
                  <AnimatedPath
                    d={CHECK_PATH}
                    stroke={palette.accentInk}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    strokeDasharray={CHECK_LENGTH}
                    animatedProps={checkProps}
                  />
                )}
              </Svg>
            </View>
          ) : null}
        </Animated.View>
      </Pressable>

      {showBar || (status === 'confirmed' && barShown) ? (
        <View
          style={[styles.track, { backgroundColor: palette.border }]}
          testID="primary-button-progress"
        >
          <Animated.View style={[styles.bar, { backgroundColor: palette.accent }, barStyle]} />
        </View>
      ) : null}

      {caption ? (
        <Text
          variant="caption"
          style={[
            styles.caption,
            { color: caption.tone === 'error' ? palette.error : palette.textSecondary },
          ]}
          accessibilityLiveRegion="polite"
        >
          {caption.text}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  button: {
    height: 52,
    borderRadius: theme.radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: theme.spacing['4'],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing['2'],
  },
  leading: {
    marginRight: theme.spacing['2'],
  },
  overlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    height: 2,
    marginTop: theme.spacing['2'],
    overflow: 'hidden',
  },
  bar: {
    height: 2,
  },
  caption: {
    marginTop: theme.spacing['2'],
  },
}));
