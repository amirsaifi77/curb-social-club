import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

// `test:og` is its own run: it renders real PNGs through Satori and resvg,
// which is slower than the unit suite and needs the node environment.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['app/**/*.og.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
  },
});
