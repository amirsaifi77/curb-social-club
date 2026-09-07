import * as Sentry from '@sentry/react-router';
import { handleRequest as vercelHandleRequest } from '@vercel/react-router/entry.server';
import type { AppLoadContext, EntryContext, HandleErrorFunction } from 'react-router';

// Server errors go to Sentry when SENTRY_DSN is set (per-tier DSN, ADR 0008).
// Vercel's serverless runtime cannot preload an instrument file, so init
// happens here at module load; loader and render errors reach handleError.
const dsn = process.env.SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.VERCEL_ENV ?? 'development',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  loadContext: AppLoadContext,
) {
  return vercelHandleRequest(
    request,
    responseStatusCode,
    responseHeaders,
    routerContext,
    loadContext,
  );
}

export const handleError: HandleErrorFunction = (error, { request }) => {
  if (request.signal.aborted) return;
  Sentry.captureException(error);
  console.error(error);
};
