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

// Haptics stand-in (no native module in jest); Reanimated's setUpTests runs
// in jest.setup-after-env.js because it extends expect.
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => {}),
  notificationAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// expo-image and expo-router's Link both reach for native views; the cards
// only care about the props they pass, so both render as plain hosts.
jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return { Image: View };
});

jest.mock('expo-router', () => {
  const React = require('react');
  const { View } = require('react-native');
  // A test double, not a component the app ships: asChild hands the child
  // straight through so a card keeps its own accessibility role.
  /* eslint-disable react/prop-types */
  const Link = (props) => {
    const { children, asChild } = props;
    return asChild
      ? React.Children.only(children)
      : React.createElement(View, { accessibilityRole: 'link' }, children);
  };
  /* eslint-enable react/prop-types */
  return {
    Link,
    router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), dismissTo: jest.fn() },
    useFocusEffect: jest.fn(),
    useLocalSearchParams: () => ({}),
  };
});

// Glass and blur are native views. The doubles keep the same tree shape, so
// a test still sees the layout the tiers share and only the material differs
// (docs/mobile-liquid-glass.md section 4).
// Defaults to the iOS 26 tier; a test that cares about the fallback tiers
// overrides it with jest.mocked(isLiquidGlassAvailable).mockReturnValue.
jest.mock('expo-glass-effect', () => {
  const { View } = require('react-native');
  const GlassView = (props) =>
    require('react').createElement(View, { ...props, testID: props.testID ?? 'glass' });
  const GlassContainer = (props) =>
    require('react').createElement(View, { ...props, testID: props.testID ?? 'glass-container' });
  return {
    GlassView,
    GlassContainer,
    isLiquidGlassAvailable: jest.fn(() => true),
    isGlassEffectAPIAvailable: jest.fn(() => true),
  };
});

// SF Symbols are a native view; a pin's glyph is asserted by its name.
jest.mock('expo-symbols', () => {
  const React = require('react');
  const { View } = require('react-native');
  /* eslint-disable react/prop-types */
  const SymbolView = (props) =>
    React.createElement(View, { accessibilityLabel: props.name, testID: 'symbol' });
  /* eslint-enable react/prop-types */
  return { SymbolView };
});

jest.mock('expo-blur', () => {
  const { View } = require('react-native');
  const BlurView = (props) =>
    require('react').createElement(View, { ...props, testID: props.testID ?? 'blur' });
  return { BlurView };
});

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  wrap: (component) => component,
  captureMessage: jest.fn(() => 'test-event-id'),
  captureException: jest.fn(),
}));

jest.mock('expo-crypto', () => {
  const nodeCrypto = require('node:crypto');
  return {
    randomUUID: () => nodeCrypto.randomUUID(),
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    digestStringAsync: async (_algorithm, value) =>
      nodeCrypto.createHash('sha256').update(value).digest('hex'),
  };
});
