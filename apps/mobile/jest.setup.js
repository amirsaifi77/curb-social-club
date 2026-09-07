// Unistyles ships jest mocks; MMKV v4 ships an in-memory mock factory.
require('react-native-unistyles/mocks');

jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/createMMKV/createMockMMKV');
  return { createMMKV: () => createMockMMKV() };
});
