import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { DiscoveredTargetsManager } from "@/components/harvester/discovered-targets-manager";

// JOB-153 : cette page n'a plus d'entrée dans HarvesterTabs (configuration de
// sources de données, pas une fonctionnalité de recherche d'emploi) — elle
// reste fonctionnelle et accessible par lien direct, voir
// docs/decisions/2026-09-01-cibles-decouvertes-navigation.md.
export default async function HarvesterDiscoveryPage() {
  const session = await auth();
  const userId = session?.user?.id ?? "";

  const targets = await prisma.discoveredTarget.findMany({
    where: { userId, status: "PENDING" },
    orderBy: { discoveredAt: "desc" },
  });

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-4 p-4">
      <PageHeader
        eyebrow="Harvester"
        title="Cibles découvertes"
        subtitle="Entreprises repérées dans vos offres et trouvées sur Workday, SmartRecruiters, Talentsoft ou DigitalRecruiters — approuvez pour les ajouter à vos campagnes."
      />
      <DiscoveredTargetsManager initialTargets={targets} />
    </div>
  );
}
