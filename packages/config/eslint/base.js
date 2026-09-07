import js from '@eslint/js';
import importX from 'eslint-plugin-import-x';
import tseslint from 'typescript-eslint';

// Shared base: typescript-eslint recommended, import ordering, no default
// exports (config files and framework routes excepted), no unused vars.
export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/build/**', '**/coverage/**', '**/.turbo/**', '**/node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { 'import-x': importX },
    rules: {
      'import-x/order': [
        'error',
        {
          groups: [['builtin', 'external'], 'internal', ['parent', 'sibling', 'index']],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import-x/no-default-export': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Tooling that requires a default export. App configs add their own
    // exception for framework route files (React Router, Expo Router).
    files: [
      '**/*.config.{js,mjs,cjs,ts,mts}',
      '**/eslint.config.js',
      '**/eslint/*.js',
      '**/prettier.config.js',
    ],
    rules: { 'import-x/no-default-export': 'off' },
  },
);
