import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

// Unit tests only; the React Router plugin is left out on purpose (it does
// not run under vitest) and Playwright owns e2e/.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['app/**/*.test.ts'],
  },
});
