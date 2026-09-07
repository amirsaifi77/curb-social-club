// Unistyles ships jest mocks; MMKV v4 ships an in-memory mock factory. The
// Keychain and crypto modules get small in-memory stand-ins.
require('react-native-unistyles/mocks');

jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/createMMKV/createMockMMKV');
  return { createMMKV: () => createMockMMKV() };
});

jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    getItemAsync: async (key) => store.get(key) ?? null,
    setItemAsync: async (key, value) => void store.set(key, value),
    deleteItemAsync: async (key) => void store.delete(key),
  };
});

jest.mock('expo-crypto', () => {
  const nodeCrypto = require('node:crypto');
  return {
    randomUUID: () => nodeCrypto.randomUUID(),
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    digestStringAsync: async (_algorithm, value) =>
      nodeCrypto.createHash('sha256').update(value).digest('hex'),
  };
});
