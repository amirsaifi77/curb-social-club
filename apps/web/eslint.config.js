import react from '@curb/config/eslint/react';

export default [
  ...react,
  {
    ignores: ['.react-router/**', '.vercel/**', 'build/**'],
  },
  {
    // React Router route modules, entries, and the route config default-export.
    files: ['app/routes/**/*.{ts,tsx}', 'app/root.tsx', 'app/routes.ts', 'app/entry.*.tsx'],
    rules: { 'import-x/no-default-export': 'off' },
  },
];
