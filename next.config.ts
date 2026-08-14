import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

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
  connect-src 'self';
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

export default nextConfig;
