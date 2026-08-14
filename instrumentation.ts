import * as Sentry from "@sentry/nextjs";

// SENTRY_DSN non défini (dev/CI locaux) : Sentry.init se désactive
// silencieusement — comportement documenté du SDK, aucun garde-fou manuel
// nécessaire (JOB-113).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
