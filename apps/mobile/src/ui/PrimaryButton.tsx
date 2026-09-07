import type { ThemeColors } from '@curb/design-tokens';
import { useAsyncAction, type AsyncActionStatus } from '@curb/ui';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Pressable,
  StyleSheet as RNStyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
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

import { standardEasing } from './motion';
import { Text } from './Text';
import { useReduceMotion } from './useReduceMotion';

// The primary CTA (docs/components/primary-cta.md, design-system-and-theming.md
// R-16, R-18). Controlled through `status`, or uncontrolled through an
// `onPress` that returns a promise, in which case the shared useAsyncAction
// machine drives idle, loading, confirmed, going, and error with the
// timings from motion.asyncButton. Every color comes from the theme (or the
// `colors` override the gallery and tests use) and every duration and
// easing from motion.

export type PrimaryButtonStatus =
  'idle' | 'loading' | 'longRunning' | 'confirmed' | 'going' | 'error' | 'queued' | 'disabled';

export interface PrimaryButtonProps {
  label: string;
  goingLabel?: string;
  status?: PrimaryButtonStatus;
  // Uncontrolled: runs through the machine. `removing` is true for the run
  // that leaves the going state.
  onPress?: (context: { removing: boolean }) => Promise<unknown> | void;
  // Tapping while going: open the confirmation, then call remove() to run
  // the removal through the button. Without it a tap on Going does nothing.
  onGoingPress?: (remove: () => void) => void;
  // Long-running variant (R-18): copy rotated every stageInterval, and the
  // progress bar once the run is past stillWorkingAfter.
  stages?: readonly string[];
  // Controlled long running only: show the bar (the caller knows the run is
  // past two seconds).
  showProgress?: boolean;
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
  showProgress = false,
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

  const removingRef = useRef(false);
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;
  const action = useAsyncAction(async () => {
    await onPressRef.current?.({ removing: removingRef.current });
  });

  const controlled = controlledStatus !== undefined;
  const longRunning = (stages?.length ?? 0) > 0;
  const status = controlled ? controlledStatus : machineToStatus(action.status, longRunning);
  const busy = status === 'loading' || status === 'longRunning';
  const pending = !controlled && action.pending;
  const showBar = status === 'longRunning' && (controlled ? showProgress : action.stillWorking);
  const interactive = !busy && !pending && status !== 'confirmed' && status !== 'disabled';

  // Timing configs from motion; hoisted so effects can list them as deps.
  const timing = useMemo(() => {
    const easing = standardEasing(motion.easing.standard);
    return {
      easing,
      fade: { duration: motion.duration.fade, easing },
      press: { duration: motion.duration.press, easing },
      release: { duration: motion.duration.release, easing },
      draw: { duration: motion.duration.draw, easing },
      settle: motion.duration.settle,
      stagger: motion.duration.stagger,
      spin: motion.duration.spin,
      spring: motion.easing.spring,
      progress: motion.asyncButton.progress,
      stageInterval: motion.asyncButton.stageInterval,
    };
  }, [motion]);

  // Fill and stroke per status; the pressed tint sits on an overlay so the
  // base fill can transition between statuses on its own.
  const accentFilled = !(status === 'going' || status === 'queued' || status === 'disabled');
  const outlined = status === 'going' || status === 'queued';
  const baseFill = outlined
    ? palette.surface
    : status === 'disabled'
      ? palette.border
      : palette.accent;
  const labelColor = outlined
    ? palette.accent
    : status === 'disabled'
      ? palette.textSecondary
      : palette.accentInk;

  // The bar, once shown, stays through confirmed so it can reach 100 percent;
  // a run that finished under stillWorkingAfter never shows it (R-18).
  const [barShown, setBarShown] = useState(false);
  useEffect(() => {
    if (showBar) setBarShown(true);
    else if (status !== 'confirmed') setBarShown(false);
  }, [showBar, status]);

  const scale = useSharedValue(1);
  const pressedTint = useSharedValue(0);
  const labelOpacity = useSharedValue(1);
  const stageOpacity = useSharedValue(1);
  const ringOpacity = useSharedValue(0);
  const rotation = useSharedValue(0);
  const draw = useSharedValue(0);
  const progress = useSharedValue(0);

  // Label, ring, and check per status. Loading hides the label under the
  // ring; long running keeps its stage copy next to the ring.
  useEffect(() => {
    const hideLabel = status === 'loading' || status === 'confirmed';
    labelOpacity.value = withTiming(hideLabel ? 0 : 1, timing.fade);
    if (busy && !reduceMotion) {
      ringOpacity.value = withDelay(timing.stagger, withTiming(1, timing.fade));
      rotation.value = withRepeat(
        withTiming(360, { duration: timing.spin, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      ringOpacity.value = withTiming(0, timing.fade);
      cancelAnimation(rotation);
      rotation.value = 0;
    }
    if (status === 'confirmed') {
      draw.value = reduceMotion ? 1 : withDelay(timing.stagger, withTiming(1, timing.draw));
    } else {
      draw.value = 0;
    }
  }, [busy, status, reduceMotion, timing, labelOpacity, ringOpacity, rotation, draw]);

  // Progress bar (R-18): fast to 60 percent, slow to 90, full on completion.
  useEffect(() => {
    if (showBar) {
      progress.value = withSequence(
        withTiming(timing.progress.fastTo, {
          duration: timing.progress.fastMs,
          easing: timing.easing,
        }),
        withTiming(timing.progress.slowTo, {
          duration: timing.progress.slowMs,
          easing: Easing.linear,
        }),
      );
    } else if (status === 'confirmed') {
      progress.value = withTiming(1, { duration: timing.settle, easing: timing.easing });
    } else {
      cancelAnimation(progress);
      progress.value = 0;
    }
  }, [showBar, status, timing, progress]);

  // Nothing keeps spinning after the button is gone.
  useEffect(
    () => () => {
      cancelAnimation(rotation);
      cancelAnimation(progress);
    },
    [rotation, progress],
  );

  // Stage copy rotation for the long-running variant, with a crossfade.
  const stagesRef = useRef(stages);
  stagesRef.current = stages;
  const stageCount = stages?.length ?? 0;
  const [stageIndex, setStageIndex] = useState(0);
  useEffect(() => {
    if (status !== 'longRunning' || stageCount < 2) {
      setStageIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setStageIndex((index) => Math.min(index + 1, stageCount - 1));
    }, timing.stageInterval);
    return () => clearInterval(interval);
  }, [status, stageCount, timing.stageInterval]);
  useEffect(() => {
    if (stageIndex === 0) return;
    stageOpacity.value = 0;
    stageOpacity.value = withTiming(1, timing.fade);
  }, [stageIndex, stageOpacity, timing.fade]);

  // Haptics and VoiceOver on status changes.
  const previous = useRef<PrimaryButtonStatus>(status);
  useEffect(() => {
    if (previous.current === status) return;
    previous.current = status;
    if (status === 'confirmed') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      AccessibilityInfo.announceForAccessibility(
        announcements?.done ?? `You're ${goingLabel.toLowerCase()}`,
      );
    } else if (status === 'error') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      AccessibilityInfo.announceForAccessibility(announcements?.failed ?? "Couldn't save");
    } else if (busy) {
      AccessibilityInfo.announceForAccessibility(announcements?.saving ?? 'Saving');
    }
  }, [status, busy, announcements, goingLabel]);

  const scaleStyle = useAnimatedStyle(() => ({
    transform: reduceMotion ? [] : [{ scale: scale.value }],
  }));
  const pressedStyle = useAnimatedStyle(() => ({ opacity: pressedTint.value }));
  const labelStyle = useAnimatedStyle(() => ({ opacity: labelOpacity.value }));
  const stageStyle = useAnimatedStyle(() => ({ opacity: stageOpacity.value }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
  const checkProps = useAnimatedProps(() => ({
    strokeDashoffset: CHECK_LENGTH * (1 - draw.value),
  }));
  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  function runRemoval() {
    removingRef.current = true;
    action.run();
  }

  function handlePress() {
    if (!interactive) return;
    if (status === 'going' || status === 'queued') {
      onGoingPress?.(runRemoval);
      return;
    }
    if (controlled) {
      void onPress?.({ removing: false });
      return;
    }
    removingRef.current = false;
    action.run();
  }

  function handlePressIn() {
    if (!interactive) return;
    if (!reduceMotion) scale.value = withSpring(0.98, timing.spring);
    if (accentFilled) pressedTint.value = withTiming(1, timing.press);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handlePressOut() {
    scale.value = withSpring(1, timing.spring);
    pressedTint.value = withTiming(0, timing.release);
  }

  const visibleLabel =
    status === 'disabled'
      ? (disabledReason ?? label)
      : outlined
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
        : status === 'loading' && !controlled && action.stillWorking
          ? { text: stillWorkingCaption, tone: 'secondary' as const }
          : null;

  const ring = (
    <Animated.View style={ringStyle} testID="primary-button-ring">
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
  );

  // Reanimated 4 CSS transition for the base fill and stroke between statuses.
  const transition: ViewStyle & {
    transitionProperty: string[];
    transitionDuration: number;
    transitionTimingFunction: 'ease-in-out';
  } = {
    transitionProperty: ['backgroundColor', 'borderColor'],
    transitionDuration: reduceMotion ? timing.fade.duration : timing.settle,
    transitionTimingFunction: 'ease-in-out',
  };

  return (
    <View style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={visibleLabel}
        accessibilityState={{ busy, disabled: status === 'disabled' }}
        disabled={status === 'disabled'}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        testID={testID}
      >
        <Animated.View
          style={[
            styles.button,
            { backgroundColor: baseFill, borderColor: outlined ? palette.accent : baseFill },
            transition,
            scaleStyle,
          ]}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              RNStyleSheet.absoluteFill,
              styles.pressedTint,
              { backgroundColor: palette.accentPressed },
              pressedStyle,
            ]}
          />

          {outlined ? (
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

          {status === 'longRunning' ? (
            <View style={styles.row}>
              {reduceMotion ? <ActivityIndicator size="small" color={palette.accentInk} /> : ring}
              <Animated.View style={stageStyle}>
                <Text variant="subhead" style={{ color: labelColor }} numberOfLines={1}>
                  {visibleLabel}
                </Text>
              </Animated.View>
            </View>
          ) : reduceMotion && status === 'loading' ? (
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

          {status === 'loading' && !reduceMotion ? (
            <View style={styles.overlay} pointerEvents="none">
              {ring}
            </View>
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
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: theme.spacing['4'],
    overflow: 'hidden',
  },
  pressedTint: {
    borderRadius: theme.radius.button,
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
