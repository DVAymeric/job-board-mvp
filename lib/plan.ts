import { prisma } from "@/lib/prisma";
import type { Plan } from "@prisma/client";

export type Feature = "csv_export";

// Un seul plan existe aujourd'hui : tout lui est accessible. Le jour où un
// palier payant existe, une nouvelle entrée ici (et nulle part ailleurs)
// suffit à restreindre des fonctionnalités par plan (JOB-80).
const ENTITLEMENTS: Record<Plan, Feature[]> = {
  FREE: ["csv_export"],
};

/** Point d'extension unique pour un futur palier payant (JOB-80) — pas de
 * logique de paiement, de webhook ni de table Subscription ici,
 * volontairement. */
export async function can(userId: string, feature: Feature): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  if (!user) return false;

  return ENTITLEMENTS[user.plan].includes(feature);
}
