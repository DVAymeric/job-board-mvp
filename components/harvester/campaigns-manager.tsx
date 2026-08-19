"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { Campaign } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { CampaignFormDialog } from "@/components/harvester/campaign-form-dialog";
import { CAMPAIGN_CONTRACT_TYPE_LABELS, type CampaignContractType } from "@/lib/harvester/campaign-validation";

export function CampaignsManager({ initialCampaigns }: { initialCampaigns: Campaign[] }) {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [selected, setSelected] = useState<Campaign | null | "new">(null);

  return (
    <div className="space-y-4">
      <Button onClick={() => setSelected("new")}>
        <Plus className="size-3.5" />
        Nouvelle campagne
      </Button>

      {campaigns.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucune campagne pour le moment — créez-en une pour commencer à collecter des offres.
        </p>
      ) : (
        <ul className="space-y-2">
          {campaigns.map((campaign) => (
            <li key={campaign.id}>
              <button
                type="button"
                onClick={() => setSelected(campaign)}
                className="flex w-full flex-col gap-1 rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted"
              >
                <span className="font-heading text-sm leading-snug text-heading">
                  {campaign.slug}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {(campaign.contractTypes as CampaignContractType[])
                    .map((type) => CAMPAIGN_CONTRACT_TYPE_LABELS[type])
                    .join(" · ") || "Aucun type de contrat"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <CampaignFormDialog
        key={selected === "new" ? "new" : (selected?.id ?? "none")}
        campaign={selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        onCreated={(campaign) => {
          setCampaigns((prev) => [campaign, ...prev]);
          setSelected(null);
        }}
        onUpdated={(campaign) => {
          setCampaigns((prev) => prev.map((c) => (c.id === campaign.id ? campaign : c)));
          setSelected(null);
        }}
        onDeleted={(id) => {
          setCampaigns((prev) => prev.filter((c) => c.id !== id));
          setSelected(null);
        }}
      />
    </div>
  );
}
