import react from './react.js';

// React rules apply on mobile too. Expo and react-native specific rules are
// layered here in session 0.4, once apps/mobile exists and eslint-config-expo
// is a real dependency; adding it now would pull the Expo toolchain into
// every workspace install with no consumer.
export default [...react];
