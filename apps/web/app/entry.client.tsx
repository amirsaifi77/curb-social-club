import * as Sentry from '@sentry/react-router';
import { startTransition, StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { HydratedRouter } from 'react-router/dom';

const dsn = import.meta.env.VITE_SENTRY_DSN;

// Browser errors and route traces; a no-op until VITE_SENTRY_DSN is set.
// VERCEL_ENV (production, preview) is exposed through vite.config.ts so the
// client tag matches the server's.
Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: import.meta.env.VERCEL_ENV ?? import.meta.env.MODE,
  integrations: [Sentry.reactRouterTracingIntegration()],
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
});

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>,
  );
});
