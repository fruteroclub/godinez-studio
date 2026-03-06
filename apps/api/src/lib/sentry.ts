import * as Sentry from "@sentry/node";

const dsn = process.env.SENTRY_DSN;

export function initSentry() {
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: 0.1,
  });
}

export { Sentry };
