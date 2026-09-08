import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

// Unit tests only; the React Router plugin is left out on purpose (it does
// not run under vitest) and Playwright owns e2e/.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['app/**/*.test.ts'],
    // The OG cards render real PNGs through Satori and resvg, which is far
    // slower than the rest; `test:og` runs them on their own config.
    exclude: ['app/**/*.og.test.ts', 'node_modules/**'],
  },
});
