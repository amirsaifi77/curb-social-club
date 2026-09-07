import type { Config } from '@react-router/dev/config';
import { vercelPreset } from '@vercel/react-router/vite';

// Framework mode with SSR (ADR 0005); the Vercel preset writes the Build
// Output API bundle that the Vercel project deploys (ADR 0008).
export default {
  ssr: true,
  presets: [vercelPreset()],
} satisfies Config;
