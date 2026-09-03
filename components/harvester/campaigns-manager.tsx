"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Campaign } from "@prisma/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CampaignFormDialog } from "@/components/harvester/campaign-form-dialog";
import { CampaignRow } from "@/components/harvester/campaign-row";
import { triggerCampaignCollection } from "@/app/actions/harvest";
import { reorderCampaigns } from "@/app/actions/campaigns";

export function CampaignsManager({ initialCampaigns }: { initialCampaigns: Campaign[] }) {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [selected, setSelected] = useState<Campaign | null | "new">(null);
  const [duplicateFrom, setDuplicateFrom] = useState<Campaign | null>(null);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  // JOB-161 : `triggeringId` (state) ne désactive le bouton qu'au prochain rendu — un double-clic
  // rapproché peut donc partir deux fois avant que React ait eu la chance de committer le
  // premier `setTriggeringId`. Cette ref est lue et écrite de façon synchrone, avant tout
  // `await`, donc le deuxième clic la trouve déjà posée quel que soit l'état de rendu.
  const triggeringCampaignIdsRef = useRef<Set<string>>(new Set());

  function closeDialog() {
    setSelected(null);
    setDuplicateFrom(null);
  }

  // Même config de sensors que le Board (JOB-108) : MouseSensor à distance
  // (évite qu'un simple clic sur la poignée déclenche un drag) + TouchSensor
  // à délai (laisse le scroll tactile natif s'amorcer avant d'activer le drag).
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = campaigns.findIndex((c) => c.id === active.id);
    const newIndex = campaigns.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const previousCampaigns = campaigns;
    const reordered = arrayMove(campaigns, oldIndex, newIndex);
    setCampaigns(reordered);

    const result = await reorderCampaigns({ orderedIds: reordered.map((c) => c.id) });
    if (!result.ok) {
      setCampaigns(previousCampaigns);
      toast.error(result.error);
    }
  }

  async function handleTrigger(campaignId: string) {
    // JOB-161 : bail out synchrone, avant le premier `await` — un deuxième clic tiré pendant la
    // fenêtre où `disabled` n'a pas encore été commité par React ne déclenche pas de deuxième
    // collecte pour la même campagne.
    if (triggeringCampaignIdsRef.current.has(campaignId)) return;
    triggeringCampaignIdsRef.current.add(campaignId);
    setTriggeringId(campaignId);
    const result = await triggerCampaignCollection({ campaignId });
    triggeringCampaignIdsRef.current.delete(campaignId);
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
        failedRuns.map((run) => run.errorMessage).filter(Boolean).join(" · ") || "Un connecteur a échoué pendant la recherche"
      );
    }
    if (offersCollected > 0 || failedRuns.length === 0) {
      toast.success(
        offersCollected > 0
          ? `${offersCollected} offre${offersCollected > 1 ? "s" : ""} trouvée${offersCollected > 1 ? "s" : ""}`
          : "Recherche terminée, aucune nouvelle offre"
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
          Aucune campagne pour le moment — créez-en une pour commencer à recevoir des offres.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={campaigns.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {campaigns.map((campaign) => (
                <CampaignRow
                  key={campaign.id}
                  campaign={campaign}
                  triggering={triggeringId === campaign.id}
                  onOpen={setSelected}
                  onDuplicate={(campaign) => {
                    setDuplicateFrom(campaign);
                    setSelected("new");
                  }}
                  onTrigger={handleTrigger}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <CampaignFormDialog
        key={
          selected === "new"
            ? (duplicateFrom ? `new-duplicate-${duplicateFrom.id}` : "new")
            : (selected?.id ?? "none")
        }
        campaign={selected}
        duplicateFrom={duplicateFrom}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        onCreated={(campaign) => {
          setCampaigns((prev) => [campaign, ...prev]);
          closeDialog();
        }}
        onUpdated={(campaign) => {
          setCampaigns((prev) => prev.map((c) => (c.id === campaign.id ? campaign : c)));
          closeDialog();
        }}
        onDeleted={(id) => {
          setCampaigns((prev) => prev.filter((c) => c.id !== id));
          closeDialog();
        }}
      />
    </div>
  );
}
