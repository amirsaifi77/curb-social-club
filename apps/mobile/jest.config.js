// Pinned so a date rendered in a fixed zone is asserted in that zone and
// not in whatever zone the machine running the suite happens to be in.
process.env.TZ = 'UTC';

module.exports = {
  preset: 'jest-expo',
  clearMocks: true,
  setupFiles: ['./jest.setup.js'],
  setupFilesAfterEnv: ['./jest.setup-after-env.js'],
  // Reanimated 4's worklets runtime: resolve its JS implementation instead
  // of the .native files, which need the native module.
  resolver: 'react-native-worklets/jest/resolver.js',
  // jest-expo's own list, plus FlashList: it ships ESM, and under pnpm the
  // pattern matches again at the inner node_modules/, so a package has to be
  // named here even though everything below .pnpm/ is otherwise transformed.
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|@shopify/flash-list|@gorhom/bottom-sheet|react-native-maps|supercluster|kdbush|native-base|standard-navigation))',
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
};
