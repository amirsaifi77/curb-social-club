import reactNative from '@curb/config/eslint/react-native';

export default [
  ...reactNative,
  {
    ignores: ['.expo/**', 'expo-env.d.ts'],
  },
  {
    // Expo Router route files must default-export their screen.
    files: ['app/**/*.{ts,tsx}', '*.config.{js,mjs}'],
    rules: { 'import-x/no-default-export': 'off' },
  },
  {
    // Metro loads font and image assets through require().
    files: ['app/_layout.tsx'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    // CommonJS tooling files executed by Node and Jest.
    files: ['babel.config.js', 'jest.config.js', 'jest.setup.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { require: 'readonly', module: 'writable', jest: 'readonly' },
    },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    // Glass and blur render only through the Surface primitive (R-14).
    files: ['**/*.{ts,tsx}'],
    ignores: ['src/ui/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'expo-glass-effect',
              message: 'Use the Surface primitive from src/ui/Surface instead (R-14).',
            },
            {
              name: 'expo-blur',
              message: 'Use the Surface primitive from src/ui/Surface instead (R-14).',
            },
          ],
        },
      ],
    },
  },
];
