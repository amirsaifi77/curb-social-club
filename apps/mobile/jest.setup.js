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

// Records where a Link would have gone, so a test can assert a tap that
// navigates rather than only that a label is on screen.
const mockNavigate = jest.fn();
global.__linkNavigations = mockNavigate;

jest.mock('expo-router', () => {
  const React = require('react');
  const { View } = require('react-native');
  // A test double, not a component the app ships. asChild clones the child
  // with an onPress, the way expo-router's Slot does: handing the child
  // straight through instead would hide a child that cannot take one, which
  // is a dead tap on device and invisible here.
  /* eslint-disable react/prop-types */
  const Link = (props) => {
    const { children, asChild, href } = props;
    if (!asChild) {
      return React.createElement(View, { accessibilityRole: 'link' }, children);
    }
    const child = React.Children.only(children);
    // React Native ignores onPress on a plain View, so a Link wrapping one
    // is a dead tap on device. The double drops it too, otherwise the test
    // would fire a handler the runtime never would.
    if (child.type === View) return child;
    return React.cloneElement(child, {
      onPress: (...args) => {
        child.props.onPress?.(...args);
        mockNavigate(href);
      },
    });
  };
  /* eslint-enable react/prop-types */
  // Screens declare their header through <Stack.Screen options>. The double
  // renders the header's own items, so a control that lives in the toolbar
  // (share, for one) is still reachable from a test.
   
  const Stack = {
    Screen: (props) => props?.options?.headerRight?.() ?? null,
  };
   
  // The zoom wrappers are presentation only; they render their children so
  // a card is still a card in a test.
  Link.AppleZoom = ({ children }) => children;
  Link.AppleZoomTarget = ({ children }) => children;

  return {
    Link,
    Stack,
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

// react-native-maps is a native view. The double keeps the tree shape so a
// screen that draws a map still renders its other blocks; MapScreen's own
// suite overrides this with one that records animateToRegion.
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  /* eslint-disable react/prop-types */
  const MapView = React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({ animateToRegion: jest.fn() }));
    return React.createElement(View, { testID: 'map' }, props.children);
  });
  MapView.displayName = 'MapView';
  const Marker = (props) =>
    React.createElement(View, { accessibilityLabel: props.accessibilityLabel }, props.children);
  /* eslint-enable react/prop-types */
  return { __esModule: true, default: MapView, MapView, Marker, PROVIDER_DEFAULT: undefined };
});

// SF Symbols are a native view; a pin's glyph is asserted by its name.
// expo-calendar is native; the rrule translation is what is under test.
jest.mock('expo-calendar/legacy', () => ({
  requestCalendarPermissionsAsync: jest.fn(async () => ({ granted: true })),
  getDefaultCalendarAsync: jest.fn(async () => ({ id: 'cal-1' })),
  createEventAsync: jest.fn(async () => 'event-1'),
  Frequency: { DAILY: 'daily', WEEKLY: 'weekly', MONTHLY: 'monthly', YEARLY: 'yearly' },
}));

jest.mock('expo-symbols', () => {
  const React = require('react');
  const { View } = require('react-native');
  /* eslint-disable react/prop-types */
  // Keeps size and tintColor: expo-symbols paints the system tint when a
  // caller omits them, which does not follow the app's themes in dark, and
  // a double that dropped them could not tell the difference.
  const SymbolView = (props) =>
    React.createElement(View, {
      accessibilityLabel: props.name,
      testID: 'symbol',
      size: props.size,
      tintColor: props.tintColor,
    });
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
