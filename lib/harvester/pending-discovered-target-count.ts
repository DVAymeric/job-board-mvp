import { prisma } from "@/lib/prisma";

export function getPendingDiscoveredTargetCount(userId: string) {
  return prisma.discoveredTarget.count({ where: { userId, status: "PENDING" } });
}
