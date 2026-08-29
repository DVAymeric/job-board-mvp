import { PageHeader } from "@/components/page-header";
import { BentoGrid } from "@/components/ui/bento-grid";
import { BentoCard } from "@/components/ui/bento-card";
import { Skeleton } from "@/components/ui/skeleton";

// JOB-117 : /analytics agrège tout côté serveur (prisma.job.findMany, cf.
// page.tsx) — pas d'état de chargement React à couvrir, seulement la
// navigation App Router. Comme pour /recherche, ce loading.tsx réutilise les
// vrais composants de layout (PageHeader, BentoGrid, BentoCard) avec les
// mêmes props span/tone/label/title : ce sont des libellés statiques (jamais
// chargés depuis la base), donc rien ne bouge visuellement une fois les
// données réelles arrivées. Seules les valeurs chiffrées/graphiques
// réellement dépendantes de la requête sont en Skeleton.
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1280px] p-4">
      <div className="mb-6">
        <PageHeader
          eyebrow="12 derniers mois"
          title="Analytics"
          subtitle="Suivi du funnel de conversion et de la régularité de vos candidatures — vos statistiques personnelles, jamais partagées ni agrégées avec d'autres utilisateurs sans votre accord."
          toolbar={<Skeleton shape="rect" className="h-11 w-36" />}
        />
      </div>

      <div aria-busy="true" aria-label="Chargement des statistiques">
        <BentoGrid>
          <BentoCard span="2x1" tone="muted" label="Vue d'ensemble" className="justify-center">
            <Skeleton shape="line" className="h-9 w-40 bg-palette-encre/15" />
            <div className="mt-3.5 flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton
                  key={index}
                  shape="rect"
                  className="h-5 w-20 rounded-full bg-palette-encre/15"
                />
              ))}
            </div>
          </BentoCard>

          <BentoCard tone="default" label="Conversion clé" title="Postulé → Entretien">
            <div className="flex flex-1 flex-col justify-between gap-2">
              <Skeleton shape="line" className="h-9 w-16" />
              <Skeleton shape="line" className="h-3.5 w-full" />
            </div>
          </BentoCard>

          <BentoCard tone="accent" label="Mois le plus actif">
            <div className="flex flex-1 flex-col justify-between gap-1">
              <Skeleton shape="line" className="h-8 w-14 bg-white/25" />
              <Skeleton shape="line" className="h-3.5 w-28 bg-white/20" />
            </div>
          </BentoCard>

          <BentoCard
            span="2x2"
            tone="default"
            label="Funnel de conversion"
            title="De l'idée à l'entretien"
          >
            <div className="space-y-3.5">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <Skeleton shape="line" className="h-3.5 w-24" />
                    <Skeleton shape="line" className="h-3 w-10" />
                  </div>
                  <Skeleton shape="rect" className="h-2.5 w-full rounded-full" />
                </div>
              ))}
            </div>
          </BentoCard>

          <BentoCard
            span="2x2"
            tone="default"
            label="Fréquence de candidature"
            title="Régularité sur 12 mois"
          >
            <Skeleton shape="rect" className="h-full min-h-36 w-full" />
          </BentoCard>

          <BentoCard
            span="4x1"
            tone="default"
            className="p-0"
            bodyClassName="flex w-full flex-col divide-y divide-border sm:flex-row sm:divide-x sm:divide-y-0"
          >
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex-1 space-y-1.5 p-5">
                <Skeleton shape="line" className="h-3 w-20" />
                <Skeleton shape="line" className="h-7 w-10" />
                <Skeleton shape="line" className="h-3 w-8" />
              </div>
            ))}
          </BentoCard>
        </BentoGrid>
      </div>
    </div>
  );
}
