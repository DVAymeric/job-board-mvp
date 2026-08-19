import { BentoCard } from "@/components/ui/bento-card";

export function AboutCard() {
  return (
    <BentoCard span="2x1" tone="muted" label="Harvester" title="Collecte automatisée d'offres">
      <p>
        Configurez des campagnes (mots-clés, zones, types de contrat) pour collecter des offres
        depuis France Travail, La Bonne Alternance, Workday et SmartRecruiters, puis importez
        celles qui vous intéressent directement dans votre board.
      </p>
    </BentoCard>
  );
}
