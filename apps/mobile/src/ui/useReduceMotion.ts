import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// Reduce Motion from iOS accessibility settings, tracked live. A caller
// can force a value (tests, the gallery's toggle).
export function useReduceMotion(override?: boolean): boolean {
  const [enabled, setEnabled] = useState(false);
  const overridden = override !== undefined;

  useEffect(() => {
    if (overridden) return;
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setEnabled(value);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setEnabled);
    return () => {
      active = false;
      subscription.remove();
    };
  }, [overridden]);

  return override ?? enabled;
}
