import * as Sentry from '@sentry/react-native';

// Crash and error reporting (ADR 0008). A no-op until EXPO_PUBLIC_SENTRY_DSN
// is set for the build (eas.json profiles read it from EAS environment
// variables; a local .env works for expo run:ios).
export const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initSentry(): void {
  Sentry.init({
    dsn: SENTRY_DSN,
    enabled: Boolean(SENTRY_DSN),
    environment:
      process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT ?? (__DEV__ ? 'development' : 'production'),
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}

// The documented test event for the mobile tier (docs/local-development.md).
export function sendSentryTestEvent(): string {
  return Sentry.captureMessage('Sentry test event from mobile', 'info');
}

export const wrapWithSentry = Sentry.wrap;
