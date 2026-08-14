// Indicateurs Postgres reconnus qui forcent une connexion TLS. `sslmode=`
// n'est vérifié qu'avec ces valeurs précises — un "sslmode=disable" ne doit
// jamais être confondu avec une connexion chiffrée par un simple test de
// présence du paramètre.
const TLS_INDICATORS = [
  "sslmode=require",
  "sslmode=verify-full",
  "sslmode=verify-ca",
  "ssl=true",
  "sslaccept=strict",
];

/**
 * Refuse de démarrer sur un vrai déploiement Vercel en production si
 * DATABASE_URL/DIRECT_URL ne force pas explicitement une connexion Postgres
 * chiffrée (JOB-120) — un chiffrement "in-transit" laissé à la config du
 * fournisseur plutôt qu'assumé peut silencieusement retomber sur une
 * connexion en clair si le paramètre manque.
 *
 * Vérifié uniquement quand `vercelEnv` est aussi défini (process.env.VERCEL),
 * pas sur le seul NODE_ENV=production : `next build` positionne déjà
 * NODE_ENV=production en local et en CI (contre un Postgres jetable sans
 * TLS), sans quoi tout build/E2E local échouerait — même distinction déjà
 * établie ailleurs dans ce projet (lib/scraper/playwright-strategy.ts).
 *
 * Ne valide pas la présence de `databaseUrl` — ce n'est pas son rôle ;
 * Prisma lui-même échoue clairement si la variable manque.
 */
export function assertDatabaseUrlIsEncrypted(
  databaseUrl: string | undefined,
  nodeEnv: string | undefined,
  vercelEnv: string | undefined
): void {
  if (nodeEnv !== "production" || !vercelEnv) return;
  if (!databaseUrl) return;

  const hasTls = TLS_INDICATORS.some((indicator) => databaseUrl.includes(indicator));
  if (!hasTls) {
    throw new Error(
      "DATABASE_URL doit forcer TLS en production (ajouter ?sslmode=require, voir .env.example) — connexion non chiffrée refusée (JOB-120)."
    );
  }
}
