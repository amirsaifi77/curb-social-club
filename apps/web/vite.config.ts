import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  // VITE_* plus Vercel's VERCEL_ENV, which tags Sentry events on the client.
  envPrefix: ['VITE_', 'VERCEL_ENV'],
});
