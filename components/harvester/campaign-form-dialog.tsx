"use client";

import { useEffect, useRef, useState } from "react";
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
import { ChipInput } from "@/components/ui/chip-input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDeleteModal } from "@/components/ui/confirm-delete-modal";
import { createCampaign, updateCampaign, deleteCampaign } from "@/app/actions/campaigns";
import {
  CAMPAIGN_CONTRACT_TYPES,
  CAMPAIGN_CONTRACT_TYPE_LABELS,
  type CampaignContractType,
} from "@/lib/harvester/campaign-validation";
import { z } from "zod";
import { HarvestTargetsSchema } from "@/lib/harvester/harvest-query";

interface LocationInput {
  label: string;
  radiusKm: string;
}

interface WorkdayTargetInput {
  tenant: string;
  site: string;
  dc: string;
}

const EMPTY_LOCATION: LocationInput = { label: "", radiusKm: "30" };

// Le nom de ville suffit ici — lat/lng ne sont plus saisis, résolus côté serveur (géocodage,
// JOB-59 suite). `config.locations` en base reste au format complet (avec lat/lng) : seul le
// label et le rayon sont ré-affichables tels quels dans le formulaire.
const CampaignConfigJsonSchema = z.object({
  locations: z.array(z.object({ label: z.string(), radiusKm: z.number() })),
  targets: HarvestTargetsSchema.optional(),
});

function locationsFromCampaign(campaign: Campaign | null): LocationInput[] {
  if (!campaign) return [EMPTY_LOCATION];
  const parsed = CampaignConfigJsonSchema.safeParse(campaign.config);
  if (!parsed.success || parsed.data.locations.length === 0) return [EMPTY_LOCATION];
  return parsed.data.locations.map((loc) => ({
    label: loc.label,
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

// JOB-151 : la planification reste une expression cron en base (aucune
// migration de schéma), mais un utilisateur grand public n'a jamais à en
// écrire une — le formulaire ne propose que ces choix en langage naturel.
const SCHEDULE_OPTIONS = [
  { value: "NONE", label: "Manuelle uniquement", cron: undefined },
  { value: "DAILY", label: "Tous les jours (7h)", cron: "0 7 * * *" },
  { value: "WEEKLY", label: "Toutes les semaines (lundi 7h)", cron: "0 7 * * 1" },
] as const;
type ScheduleOptionValue = (typeof SCHEDULE_OPTIONS)[number]["value"] | "CUSTOM";

// Une campagne existante peut porter une expression cron qui ne correspond à
// aucun des choix simplifiés ci-dessus (créée avant ce formulaire, ou par un
// autre outil) — plutôt que de la perdre silencieusement, on la préserve
// telle quelle sous un choix "Personnalisé" non modifiable dans cette UI.
function scheduleOptionFromCron(cron: string | null | undefined): ScheduleOptionValue {
  if (!cron) return "NONE";
  const match = SCHEDULE_OPTIONS.find((option) => option.cron === cron);
  return match ? match.value : "CUSTOM";
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

  const [name, setName] = useState(existing?.name ?? "");
  const [keywords, setKeywords] = useState<string[]>(existing?.keywords ?? []);
  const [contractTypes, setContractTypes] = useState<CampaignContractType[]>(
    (existing?.contractTypes as CampaignContractType[] | undefined) ?? []
  );
  const [locations, setLocations] = useState<LocationInput[]>(locationsFromCampaign(existing));
  // JOB-151 : plus aucune UI n'édite les cibles Workday/SmartRecruiters
  // (configuration technique par connecteur) — mais une campagne existante qui
  // en avait déjà les conserve telles quelles, round-trippées sans perte à
  // chaque enregistrement.
  const [workdayTargets] = useState<WorkdayTargetInput[]>(workdayTargetsFromCampaign(existing));
  const [smartrecruiters] = useState(smartrecruitersFromCampaign(existing));
  const [scheduleOption, setScheduleOption] = useState<ScheduleOptionValue>(
    scheduleOptionFromCron(existing?.schedule)
  );
  const [rawSchedule] = useState(existing?.schedule ?? undefined);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const formErrorRef = useRef<HTMLDivElement>(null);
  const formErrorId = "campaign-form-error";

  const open = campaign !== null;

  // Déplace le focus vers le message d'erreur à chaque échec de soumission,
  // pour qu'il soit annoncé immédiatement (JOB-116) — le toast Sonner reste
  // en place en complément mais n'est pas fiable pour les lecteurs d'écran.
  useEffect(() => {
    if (formError) {
      formErrorRef.current?.focus();
    }
  }, [formError]);

  function toggleContractType(type: CampaignContractType) {
    setContractTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  function updateLocation(index: number, patch: Partial<LocationInput>) {
    setLocations((prev) => prev.map((loc, i) => (i === index ? { ...loc, ...patch } : loc)));
  }

  function buildPayload() {
    const parsedLocations = locations
      .filter((loc) => loc.label.trim())
      .map((loc) => ({
        label: loc.label.trim(),
        radiusKm: Number(loc.radiusKm),
      }));
    const parsedWorkdayTargets = workdayTargets
      .filter((t) => t.tenant.trim() && t.site.trim() && t.dc.trim())
      .map((t) => ({ tenant: t.tenant.trim(), site: t.site.trim(), dc: t.dc.trim() }));
    const smartrecruitersSlugs = splitCommaList(smartrecruiters);
    const hasTargets = parsedWorkdayTargets.length > 0 || smartrecruitersSlugs.length > 0;

    return {
      name: name.trim() || undefined,
      keywords,
      contractTypes,
      locations: parsedLocations,
      targets: hasTargets
        ? {
            ...(parsedWorkdayTargets.length > 0 ? { workday: parsedWorkdayTargets } : {}),
            ...(smartrecruitersSlugs.length > 0 ? { smartrecruiters: smartrecruitersSlugs } : {}),
          }
        : undefined,
      schedule:
        scheduleOption === "CUSTOM"
          ? rawSchedule
          : SCHEDULE_OPTIONS.find((option) => option.value === scheduleOption)?.cron,
    };
  }

  async function handleSave() {
    setSaving(true);
    setFormError(null);
    const payload = buildPayload();
    const result = isNew
      ? await createCampaign(payload)
      : await updateCampaign({ ...payload, campaignId: existing!.id });
    setSaving(false);
    if (!result.ok) {
      // L'action serveur ne renvoie qu'un message global (ActionResult.error
      // est une string, pas d'erreurs structurées par champ côté validation
      // Zod — cf. app/actions/campaigns.ts / firstIssueMessage) : affiché
      // tel quel en inline, pas de mapping par champ inventé.
      setFormError(result.error);
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
            Mots-clés, zones géographiques et types de contrat visés par cette campagne.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-y-auto px-1">
          <div className="space-y-1.5">
            <label htmlFor="campaign-name" className="text-base font-medium">
              Nom (optionnel)
            </label>
            <Input
              id="campaign-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Data"
              disabled={saving}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="campaign-keywords" className="text-base font-medium">
              Mots-clés
            </label>
            <ChipInput
              id="campaign-keywords"
              values={keywords}
              onChange={setKeywords}
              placeholder="data analyst, BI"
              disabled={saving}
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-base font-medium">Types de contrat</span>
            <div className="flex flex-wrap gap-3">
              {CAMPAIGN_CONTRACT_TYPES.map((type) => (
                <label key={type} className="flex items-center gap-1.5 text-base">
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
            <span className="text-base font-medium">Localisations</span>
            <div className="space-y-2">
              {locations.map((loc, index) => (
                <div key={index} className="flex flex-wrap items-center gap-1.5">
                  <Input
                    aria-label="Ville"
                    value={loc.label}
                    onChange={(e) => updateLocation(index, { label: e.target.value })}
                    placeholder="Lille"
                    className="w-32"
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
            <label htmlFor="campaign-schedule" className="text-base font-medium">
              Fréquence de recherche
            </label>
            <Select
              value={scheduleOption}
              onValueChange={(value) => setScheduleOption((value ?? "NONE") as ScheduleOptionValue)}
            >
              <SelectTrigger id="campaign-schedule" className="!h-11 w-full" disabled={saving}>
                <SelectValue>
                  {(value: ScheduleOptionValue) =>
                    value === "CUSTOM"
                      ? "Personnalisé"
                      : (SCHEDULE_OPTIONS.find((option) => option.value === value)?.label ?? value)
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SCHEDULE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
                {scheduleOption === "CUSTOM" && (
                  <SelectItem value="CUSTOM">Personnalisé</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {formError && (
          <div
            id={formErrorId}
            ref={formErrorRef}
            role="alert"
            tabIndex={-1}
            className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-base text-destructive outline-none"
          >
            {formError}
          </div>
        )}

        <DialogFooter className="gap-2">
          {!isNew && (
            <ConfirmDeleteModal
              trigger={
                <Button variant="destructive" disabled={saving}>
                  Supprimer
                </Button>
              }
              title="Supprimer cette campagne ?"
              description={`La campagne "${existing?.slug}" et les offres déjà trouvées associées seront définitivement supprimées.`}
              onConfirm={handleDelete}
            />
          )}
          <Button
            onClick={handleSave}
            disabled={saving || contractTypes.length === 0}
            aria-describedby={formError ? formErrorId : undefined}
          >
            {saving && <Loader2 className="animate-spin" />}
            {isNew ? "Créer la campagne" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
