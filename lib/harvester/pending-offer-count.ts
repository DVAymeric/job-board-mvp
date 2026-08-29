import { prisma } from "@/lib/prisma";

export function getPendingOfferCount(userId: string) {
  return prisma.harvestedOffer.count({
    where: { userId, importedJobId: null, ignoredAt: null },
  });
}
