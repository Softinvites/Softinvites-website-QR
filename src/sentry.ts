import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || "https://8375301ae290dc7f364f382e9d2c96ad@o4510460575219712.ingest.us.sentry.io/4510460577447936",
  environment: import.meta.env.MODE,
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
});