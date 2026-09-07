module.exports = {
  preset: 'jest-expo',
  clearMocks: true,
  setupFiles: ['./jest.setup.js'],
  setupFilesAfterEnv: ['./jest.setup-after-env.js'],
  // Reanimated 4's worklets runtime: resolve its JS implementation instead
  // of the .native files, which need the native module.
  resolver: 'react-native-worklets/jest/resolver.js',
};
