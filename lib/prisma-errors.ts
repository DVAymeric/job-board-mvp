import { Prisma } from "@prisma/client";

/**
 * Violation de contrainte d'unicité (P2002). Deux usages distincts dans le code :
 * - retry d'un identifiant généré en collision (slug de campagne, app/actions/campaigns.ts) ;
 * - course concurrente sur une table partagée, où la collision est attendue et bénigne parce
 *   que l'écriture perdante posait la même valeur (DiscoveryProbe, import d'offre).
 */
export function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
