import { Easing } from 'react-native-reanimated';

// The standard easing token is a CSS string (design-tokens motion.easing.standard);
// Reanimated wants the four control points.
export function cubicBezierPoints(css: string): [number, number, number, number] {
  const match = /cubic-bezier\(\s*([^)]+)\)/.exec(css);
  const parts = match?.[1]?.split(',').map((part) => Number(part.trim())) ?? [];
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
    throw new Error(`Not a cubic-bezier easing: ${css}`);
  }
  return [parts[0]!, parts[1]!, parts[2]!, parts[3]!];
}

export function standardEasing(css: string): ReturnType<typeof Easing.bezier> {
  const [x1, y1, x2, y2] = cubicBezierPoints(css);
  return Easing.bezier(x1, y1, x2, y2);
}
