import * as Sentry from "@sentry/nextjs";

// NEXT_PUBLIC_SENTRY_DSN non défini (dev/CI locaux) : Sentry.init se
// désactive silencieusement (JOB-113).
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
});

// Requis par le SDK pour instrumenter les navigations App Router (breadcrumbs
// de changement de page, regroupement des erreurs par route).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
