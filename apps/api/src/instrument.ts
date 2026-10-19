import * as Sentry from "@sentry/nestjs";

// Error monitoring (rules.md §8.7), API only for now (user, 2026-10-20).
// Loaded before anything else in main.ts. Off unless SENTRY_DSN is set.
// Only unexpected errors (500s) are sent, by AllExceptionsFilter, and no
// personal data: request bodies, cookies, headers and user info are removed.
const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    // Errors only: performance tracing would use up the free quota.
    tracesSampleRate: 0,
    beforeSend(event) {
      if (event.request) {
        event.request = {
          method: event.request.method,
          url: event.request.url,
        };
      }
      delete event.user;
      return event;
    },
  });
}
