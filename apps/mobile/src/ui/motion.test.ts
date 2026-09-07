import { motion } from '@curb/design-tokens';
import { describe, expect, it } from '@jest/globals';

import { cubicBezierPoints } from './motion';

describe('cubicBezierPoints', () => {
  it('reads the standard easing token', () => {
    expect(cubicBezierPoints(motion.easing.standard)).toEqual([0.2, 0, 0, 1]);
  });

  it('rejects anything else', () => {
    expect(() => cubicBezierPoints('ease-in-out')).toThrow('Not a cubic-bezier');
  });
});
