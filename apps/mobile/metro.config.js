// Expo's default Metro config plus Sentry's debug-id injection, so stack
// traces symbolicate once source maps are uploaded (SENTRY_AUTH_TOKEN).
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

module.exports = getSentryExpoConfig(__dirname);
