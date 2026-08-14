import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const isDev = process.env.NODE_ENV === "development";

// Le SDK client Sentry (JOB-113) envoie les événements directement au DSN
// configuré : whitelist son origine dans connect-src si un DSN est défini,
// sinon rien à ajouter (SENTRY_DSN absent = SDK désactivé, cf.
// instrumentation-client.ts).
const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const sentryConnectSrc = sentryDsn ? ` ${new URL(sentryDsn).origin}` : "";

// Sans nonce (pas de rendu dynamique forcé sur toutes les routes) : l'app
// n'a pas besoin d'un CSP strict à base de nonce (pas de contenu utilisateur
// injecté en script), donc 'unsafe-inline' reste un compromis raisonnable —
// requis par le script d'anti-flash de next-themes et par les styles
// inline posés par les primitives Base UI (positionnement des popovers/
// dialogs). img-src whiteliste explicitement les deux fournisseurs de logo
// (Clearbit, Brandfetch) utilisés par lib/company-logo.ts ; toute autre
// origine d'image est bloquée et déclenche le fallback avatar existant
// (components/board/company-avatar.tsx, onError).
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""};
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https://logo.clearbit.com https://cdn.brandfetch.io;
  font-src 'self';
  connect-src 'self'${sentryConnectSrc};
  worker-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, " ")
  .trim();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // Next.js limite le corps des Server Actions à 1 Mo par défaut.
      // importBackupJson accepte des sauvegardes jusqu'à 4 Mo (JOB-90,
      // lib/backup.ts MAX_BACKUP_FILE_SIZE_BYTES) : 5 Mo laisse la marge
      // recommandée par Next pour l'overhead de la requête.
      bodySizeLimit: "5mb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: cspHeader },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

// silent + les identifiants org/project/authToken absents (dev/CI locaux) :
// le plugin Sentry saute l'upload des source maps sans faire échouer le
// build (JOB-113) — seule la prod, avec SENTRY_AUTH_TOKEN configuré côté
// Vercel, uploade réellement des source maps.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: true,
});
