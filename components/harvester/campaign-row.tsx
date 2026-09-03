"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, GripVertical, Loader2, Play } from "lucide-react";
import type { Campaign } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { CAMPAIGN_CONTRACT_TYPE_LABELS, type CampaignContractType } from "@/lib/harvester/campaign-validation";
import { cn } from "@/lib/utils";

export function CampaignRow({
  campaign,
  triggering,
  onOpen,
  onDuplicate,
  onTrigger,
}: {
  campaign: Campaign;
  triggering: boolean;
  onOpen: (campaign: Campaign) => void;
  onDuplicate: (campaign: Campaign) => void;
  onTrigger: (campaignId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: campaign.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const displayName = campaign.name ?? campaign.slug;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border p-3 transition-colors hover:bg-muted",
        isDragging && "relative z-10 opacity-70"
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(campaign)}
        className="flex min-w-0 flex-1 flex-col gap-1 text-left"
      >
        <span className="font-heading text-sm leading-snug text-heading">{displayName}</span>
        {campaign.name && (
          <span className="font-mono text-xs text-muted-foreground">{campaign.slug}</span>
        )}
        <span className="font-mono text-xs text-muted-foreground">
          {(campaign.contractTypes as CampaignContractType[])
            .map((type) => CAMPAIGN_CONTRACT_TYPE_LABELS[type])
            .join(" · ") || "Aucun type de contrat"}
        </span>
      </button>
      <Button
        size="sm"
        variant="outline"
        aria-label={`Dupliquer ${displayName}`}
        onClick={() => onDuplicate(campaign)}
      >
        <Copy className="size-3.5" />
      </Button>
      <Button size="sm" variant="outline" disabled={triggering} onClick={() => onTrigger(campaign.id)}>
        {triggering ? <Loader2 className="animate-spin" /> : <Play className="size-3.5" />}
        Chercher des offres
      </Button>
      {/* Poignée de glisser-déposer (JOB-153), à droite de "Chercher des offres" —
          dédiée plutôt que sur toute la ligne : la ligne porte déjà plusieurs
          cibles cliquables (ouvrir, dupliquer, chercher des offres) qu'un
          listener global casserait. */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Réordonner ${displayName}`}
        className="cursor-grab touch-none rounded-lg p-1 text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 active:cursor-grabbing"
      >
        <GripVertical className="size-4" />
      </button>
    </li>
  );
}
