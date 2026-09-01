import Link from "next/link";
import { BentoCard } from "@/components/ui/bento-card";
import { Button } from "@/components/ui/button";

interface ReviewQueueCardProps {
  pendingCount: number;
}

export function ReviewQueueCard({ pendingCount }: ReviewQueueCardProps) {
  return (
    <BentoCard span="1x2" tone="accent" label="À traiter" title="Nouvelles offres">
      <div className="flex h-full flex-col gap-3">
        {pendingCount > 0 ? (
          <p>
            <span className="font-heading text-2xl text-white">{pendingCount}</span> offre
            {pendingCount > 1 ? "s" : ""} trouvée{pendingCount > 1 ? "s" : ""} en attente.
          </p>
        ) : (
          <p data-testid="review-queue-empty">
            Aucune offre en attente — lancez une recherche depuis une campagne pour en trouver.
          </p>
        )}
        <Button
          render={<Link href="/harvester/review" prefetch={false} />}
          nativeButton={false}
          size="sm"
          className="mt-auto self-start"
        >
          Voir les nouvelles offres
        </Button>
      </div>
    </BentoCard>
  );
}
