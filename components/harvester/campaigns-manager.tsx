"use client";

import { useState } from "react";
import { Loader2, Plus, Play } from "lucide-react";
import type { Campaign } from "@prisma/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CampaignFormDialog } from "@/components/harvester/campaign-form-dialog";
import { triggerCampaignCollection } from "@/app/actions/harvest";
import { CAMPAIGN_CONTRACT_TYPE_LABELS, type CampaignContractType } from "@/lib/harvester/campaign-validation";

export function CampaignsManager({ initialCampaigns }: { initialCampaigns: Campaign[] }) {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [selected, setSelected] = useState<Campaign | null | "new">(null);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);

  async function handleTrigger(campaignId: string) {
    setTriggeringId(campaignId);
    const result = await triggerCampaignCollection({ campaignId });
    setTriggeringId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const offersCollected = result.data.runs.reduce((sum, run) => sum + run.normalizedCount, 0);
    // JOB-64 : un run par connecteur peut échouer individuellement (ex. localisation sans code
    // postal exploitable, refusée explicitement côté France Travail) sans que la Server Action
    // elle-même échoue — sans ceci, l'utilisateur ne voyait qu'un succès générique alors qu'un
    // connecteur avait échoué en silence côté serveur.
    const failedRuns = result.data.runs.filter((run) => !run.ok);
    if (failedRuns.length > 0) {
      toast.error(
        failedRuns.map((run) => run.errorMessage).filter(Boolean).join(" · ") || "Un connecteur a échoué pendant la collecte"
      );
    }
    if (offersCollected > 0 || failedRuns.length === 0) {
      toast.success(
        offersCollected > 0
          ? `${offersCollected} offre${offersCollected > 1 ? "s" : ""} collectée${offersCollected > 1 ? "s" : ""}`
          : "Collecte terminée, aucune nouvelle offre"
      );
    }
  }

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
            <li
              key={campaign.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 transition-colors hover:bg-muted"
            >
              <button
                type="button"
                onClick={() => setSelected(campaign)}
                className="flex min-w-0 flex-1 flex-col gap-1 text-left"
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
              <Button
                size="sm"
                variant="outline"
                disabled={triggeringId === campaign.id}
                onClick={() => handleTrigger(campaign.id)}
              >
                {triggeringId === campaign.id ? <Loader2 className="animate-spin" /> : <Play className="size-3.5" />}
                Lancer la collecte
              </Button>
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
