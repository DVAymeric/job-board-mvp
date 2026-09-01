import Link from "next/link";
import { BentoCard } from "@/components/ui/bento-card";
import { Button } from "@/components/ui/button";

interface CampaignsCardProps {
  count: number;
}

export function CampaignsCard({ count }: CampaignsCardProps) {
  return (
    <BentoCard span="1x2" tone="dark" label="Recherche" title="Campagnes">
      <div className="flex h-full flex-col gap-3">
        {count > 0 ? (
          <p>
            <span className="font-heading text-2xl text-white">{count}</span>{" "}
            campagne{count > 1 ? "s" : ""} active{count > 1 ? "s" : ""}.
          </p>
        ) : (
          <p data-testid="campaigns-empty">
            Aucune campagne pour le moment — configurez des mots-clés, zones et types de
            contrat pour lancer une première recherche.
          </p>
        )}
        <Button
          render={<Link href="/harvester/campaigns" prefetch={false} />}
          nativeButton={false}
          size="sm"
          className="mt-auto self-start"
        >
          {count > 0 ? "Gérer mes campagnes" : "Créer une campagne"}
        </Button>
      </div>
    </BentoCard>
  );
}
