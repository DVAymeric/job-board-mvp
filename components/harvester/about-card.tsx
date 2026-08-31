import { BentoCard } from "@/components/ui/bento-card";

export function AboutCard() {
  return (
    <BentoCard span="2x1" tone="muted" label="Alertes emploi" title="Trouvez des offres automatiquement">
      <p>
        Créez des alertes (mots-clés, zones, types de contrat) pour trouver des offres depuis
        France Travail, La Bonne Alternance, Workday et SmartRecruiters, puis ajoutez à votre
        suivi celles qui vous intéressent directement depuis votre board.
      </p>
    </BentoCard>
  );
}
