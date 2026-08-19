"use client";

import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import type { Campaign } from "@prisma/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteModal } from "@/components/ui/confirm-delete-modal";
import { createCampaign, updateCampaign, deleteCampaign } from "@/app/actions/campaigns";
import {
  CAMPAIGN_CONTRACT_TYPES,
  CAMPAIGN_CONTRACT_TYPE_LABELS,
  type CampaignContractType,
} from "@/lib/harvester/campaign-validation";
import { z } from "zod";
import { LocationConfigSchema } from "@/lib/harvester/campaign-config";
import { HarvestTargetsSchema } from "@/lib/harvester/harvest-query";

interface LocationInput {
  label: string;
  lat: string;
  lng: string;
  radiusKm: string;
}

interface WorkdayTargetInput {
  tenant: string;
  site: string;
  dc: string;
}

const EMPTY_LOCATION: LocationInput = { label: "", lat: "", lng: "", radiusKm: "30" };
const EMPTY_WORKDAY_TARGET: WorkdayTargetInput = { tenant: "", site: "", dc: "" };

const CampaignConfigJsonSchema = z.object({
  locations: z.array(LocationConfigSchema),
  targets: HarvestTargetsSchema.optional(),
});

function locationsFromCampaign(campaign: Campaign | null): LocationInput[] {
  if (!campaign) return [EMPTY_LOCATION];
  const parsed = CampaignConfigJsonSchema.safeParse(campaign.config);
  if (!parsed.success || parsed.data.locations.length === 0) return [EMPTY_LOCATION];
  return parsed.data.locations.map((loc) => ({
    label: loc.label,
    lat: String(loc.lat),
    lng: String(loc.lng),
    radiusKm: String(loc.radiusKm),
  }));
}

function workdayTargetsFromCampaign(campaign: Campaign | null): WorkdayTargetInput[] {
  if (!campaign) return [];
  const parsed = CampaignConfigJsonSchema.safeParse(campaign.config);
  return parsed.success ? (parsed.data.targets?.workday ?? []) : [];
}

function smartrecruitersFromCampaign(campaign: Campaign | null): string {
  if (!campaign) return "";
  const parsed = CampaignConfigJsonSchema.safeParse(campaign.config);
  return parsed.success ? (parsed.data.targets?.smartrecruiters ?? []).join(", ") : "";
}

function splitCommaList(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

export function CampaignFormDialog({
  campaign,
  onOpenChange,
  onCreated,
  onUpdated,
  onDeleted,
}: {
  campaign: Campaign | null | "new";
  onOpenChange: (open: boolean) => void;
  onCreated: (campaign: Campaign) => void;
  onUpdated: (campaign: Campaign) => void;
  onDeleted: (id: string) => void;
}) {
  const isNew = campaign === "new";
  const existing = isNew ? null : campaign;

  const [slug, setSlug] = useState(existing?.slug ?? "");
  const [romeCodes, setRomeCodes] = useState((existing?.romeCodes ?? []).join(", "));
  const [keywords, setKeywords] = useState((existing?.keywords ?? []).join(", "));
  const [contractTypes, setContractTypes] = useState<CampaignContractType[]>(
    (existing?.contractTypes as CampaignContractType[] | undefined) ?? []
  );
  const [locations, setLocations] = useState<LocationInput[]>(locationsFromCampaign(existing));
  const [workdayTargets, setWorkdayTargets] = useState<WorkdayTargetInput[]>(
    workdayTargetsFromCampaign(existing)
  );
  const [smartrecruiters, setSmartrecruiters] = useState(smartrecruitersFromCampaign(existing));
  const [schedule, setSchedule] = useState(existing?.schedule ?? "");
  const [saving, setSaving] = useState(false);

  const open = campaign !== null;

  function toggleContractType(type: CampaignContractType) {
    setContractTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  function updateLocation(index: number, patch: Partial<LocationInput>) {
    setLocations((prev) => prev.map((loc, i) => (i === index ? { ...loc, ...patch } : loc)));
  }

  function updateWorkdayTarget(index: number, patch: Partial<WorkdayTargetInput>) {
    setWorkdayTargets((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }

  function buildPayload() {
    const parsedLocations = locations
      .filter((loc) => loc.label.trim())
      .map((loc) => ({
        label: loc.label.trim(),
        lat: Number(loc.lat),
        lng: Number(loc.lng),
        radiusKm: Number(loc.radiusKm),
      }));
    const parsedWorkdayTargets = workdayTargets
      .filter((t) => t.tenant.trim() && t.site.trim() && t.dc.trim())
      .map((t) => ({ tenant: t.tenant.trim(), site: t.site.trim(), dc: t.dc.trim() }));
    const smartrecruitersSlugs = splitCommaList(smartrecruiters);
    const hasTargets = parsedWorkdayTargets.length > 0 || smartrecruitersSlugs.length > 0;

    return {
      slug: slug.trim(),
      romeCodes: splitCommaList(romeCodes),
      keywords: splitCommaList(keywords),
      contractTypes,
      locations: parsedLocations,
      targets: hasTargets
        ? {
            ...(parsedWorkdayTargets.length > 0 ? { workday: parsedWorkdayTargets } : {}),
            ...(smartrecruitersSlugs.length > 0 ? { smartrecruiters: smartrecruitersSlugs } : {}),
          }
        : undefined,
      schedule: schedule.trim() || undefined,
    };
  }

  async function handleSave() {
    setSaving(true);
    const payload = buildPayload();
    const result = isNew
      ? await createCampaign(payload)
      : await updateCampaign({ ...payload, campaignId: existing!.id });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    if (isNew) {
      onCreated(result.data.campaign);
      toast.success("Campagne créée");
    } else {
      onUpdated(result.data.campaign);
      toast.success("Campagne mise à jour");
    }
  }

  async function handleDelete(): Promise<boolean> {
    if (!existing) return false;
    const result = await deleteCampaign({ campaignId: existing.id });
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    onDeleted(existing.id);
    toast.success("Campagne supprimée");
    return true;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-full max-w-lg flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isNew ? "Nouvelle campagne" : "Modifier la campagne"}</DialogTitle>
          <DialogDescription>
            Mots-clés, zones géographiques et types de contrat visés par cette collecte.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-y-auto px-1">
          <div className="space-y-1.5">
            <label htmlFor="campaign-slug" className="text-sm font-medium">
              Identifiant
            </label>
            <Input
              id="campaign-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="alternance-data-hdf"
              disabled={saving}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="campaign-rome-codes" className="text-sm font-medium">
              Codes ROME
            </label>
            <Input
              id="campaign-rome-codes"
              value={romeCodes}
              onChange={(e) => setRomeCodes(e.target.value)}
              placeholder="M1403, M1805"
              disabled={saving}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="campaign-keywords" className="text-sm font-medium">
              Mots-clés
            </label>
            <Input
              id="campaign-keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="data analyst, BI"
              disabled={saving}
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-sm font-medium">Types de contrat</span>
            <div className="flex flex-wrap gap-3">
              {CAMPAIGN_CONTRACT_TYPES.map((type) => (
                <label key={type} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={contractTypes.includes(type)}
                    onChange={() => toggleContractType(type)}
                    disabled={saving}
                  />
                  {CAMPAIGN_CONTRACT_TYPE_LABELS[type]}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-sm font-medium">Localisations</span>
            <div className="space-y-2">
              {locations.map((loc, index) => (
                <div key={index} className="flex flex-wrap items-center gap-1.5">
                  <Input
                    aria-label="Libellé"
                    value={loc.label}
                    onChange={(e) => updateLocation(index, { label: e.target.value })}
                    placeholder="Lille 59000"
                    className="w-32"
                    disabled={saving}
                  />
                  <Input
                    aria-label="Latitude"
                    value={loc.lat}
                    onChange={(e) => updateLocation(index, { lat: e.target.value })}
                    placeholder="Latitude"
                    className="w-24"
                    disabled={saving}
                  />
                  <Input
                    aria-label="Longitude"
                    value={loc.lng}
                    onChange={(e) => updateLocation(index, { lng: e.target.value })}
                    placeholder="Longitude"
                    className="w-24"
                    disabled={saving}
                  />
                  <Input
                    aria-label="Rayon (km)"
                    value={loc.radiusKm}
                    onChange={(e) => updateLocation(index, { radiusKm: e.target.value })}
                    placeholder="Rayon km"
                    className="w-20"
                    disabled={saving}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Retirer cette localisation"
                    onClick={() => setLocations((prev) => prev.filter((_, i) => i !== index))}
                    disabled={saving || locations.length <= 1}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLocations((prev) => [...prev, { ...EMPTY_LOCATION }])}
                disabled={saving}
              >
                <Plus className="size-3.5" />
                Ajouter une localisation
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-sm font-medium">Cibles Workday (optionnel)</span>
            <div className="space-y-2">
              {workdayTargets.map((target, index) => (
                <div key={index} className="flex flex-wrap items-center gap-1.5">
                  <Input
                    aria-label="Tenant Workday"
                    value={target.tenant}
                    onChange={(e) => updateWorkdayTarget(index, { tenant: e.target.value })}
                    placeholder="tenant"
                    className="w-24"
                    disabled={saving}
                  />
                  <Input
                    aria-label="Site Workday"
                    value={target.site}
                    onChange={(e) => updateWorkdayTarget(index, { site: e.target.value })}
                    placeholder="site"
                    className="w-24"
                    disabled={saving}
                  />
                  <Input
                    aria-label="Datacenter Workday"
                    value={target.dc}
                    onChange={(e) => updateWorkdayTarget(index, { dc: e.target.value })}
                    placeholder="dc"
                    className="w-20"
                    disabled={saving}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Retirer cette cible Workday"
                    onClick={() => setWorkdayTargets((prev) => prev.filter((_, i) => i !== index))}
                    disabled={saving}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setWorkdayTargets((prev) => [...prev, { ...EMPTY_WORKDAY_TARGET }])}
                disabled={saving}
              >
                <Plus className="size-3.5" />
                Ajouter une cible Workday
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="campaign-smartrecruiters" className="text-sm font-medium">
              Cibles SmartRecruiters (optionnel)
            </label>
            <Input
              id="campaign-smartrecruiters"
              value={smartrecruiters}
              onChange={(e) => setSmartrecruiters(e.target.value)}
              placeholder="MAZARS, TOTALENERGIES"
              disabled={saving}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="campaign-schedule" className="text-sm font-medium">
              Planification (optionnel)
            </label>
            <Input
              id="campaign-schedule"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              placeholder="0 7 * * * (expression cron)"
              disabled={saving}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          {!isNew && (
            <ConfirmDeleteModal
              trigger={
                <Button variant="destructive" disabled={saving}>
                  Supprimer
                </Button>
              }
              title="Supprimer cette campagne ?"
              description={`La campagne "${existing?.slug}" et les offres déjà collectées associées seront définitivement supprimées.`}
              onConfirm={handleDelete}
            />
          )}
          <Button
            onClick={handleSave}
            disabled={saving || !slug.trim() || contractTypes.length === 0}
          >
            {saving && <Loader2 className="animate-spin" />}
            {isNew ? "Créer la campagne" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
