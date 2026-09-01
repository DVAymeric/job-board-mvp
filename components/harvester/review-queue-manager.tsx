"use client";

import { useEffect, useMemo, useState } from "react";
import Link, { useLinkStatus } from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { HarvestedOffer } from "@prisma/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDeleteModal } from "@/components/ui/confirm-delete-modal";
import { importHarvestedOffer, ignoreHarvestedOffer, clearHarvestedOffers } from "@/app/actions/harvest";
import { CAMPAIGN_CONTRACT_TYPE_LABELS } from "@/lib/harvester/campaign-validation";
import { getSourceLabel } from "@/lib/harvester/source-labels";

// Sentinelle de "pas de filtre" pour le Select (base-ui n'admet pas une
// SelectItem à valeur vide) — même pattern que CONTRACT_TYPE_NONE dans
// components/board/job-dialog.tsx.
const CONTRACT_TYPE_ALL = "ALL";

function formatDate(value: string | null): string {
  return value ? value.slice(0, 10) : "—";
}

// JOB-117 : "Page suivante" est un vrai <Link> Next.js (navigation App
// Router vers /harvester/review?cursor=..., pas un fetch client) avec déjà
// prefetch={false} — exactement le cas d'usage documenté pour useLinkStatus.
// Ce hook ne peut être appelé que dans un descendant du <Link> lui-même
// (ici, un enfant du Button rendu comme Link) : ce petit composant le lit et
// remonte l'état "pending" au parent, qui affiche des cartes squelettes à sa
// place le temps que le nouveau payload RSC arrive.
function NextPagePendingBridge({ onPendingChange }: { onPendingChange: (pending: boolean) => void }) {
  const { pending } = useLinkStatus();
  useEffect(() => {
    onPendingChange(pending);
  }, [pending, onPendingChange]);
  return null;
}

function ReviewQueueCardSkeleton() {
  return (
    <li aria-hidden="true" className="flex flex-col gap-3 rounded-xl border border-border p-3 md:flex-row md:items-center md:justify-between md:gap-4">
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton shape="line" className="h-4 w-40 max-w-full" />
        <Skeleton shape="line" className="h-3.5 w-56 max-w-full" />
        <Skeleton shape="rect" className="h-5 w-24 rounded-full" />
      </div>
      <span className="flex gap-1.5">
        <Skeleton shape="rect" className="h-11 w-full flex-1 md:w-32 md:flex-none" />
        <Skeleton shape="rect" className="h-11 w-full flex-1 md:w-20 md:flex-none" />
      </span>
    </li>
  );
}

export function ReviewQueueManager({
  initialOffers,
  nextCursor,
  campaigns = [],
}: {
  initialOffers: HarvestedOffer[];
  nextCursor: string | null;
  campaigns?: { id: string; name: string | null; slug: string }[];
}) {
  const [offers, setOffers] = useState(initialOffers);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [city, setCity] = useState("");
  const [contractType, setContractType] = useState(CONTRACT_TYPE_ALL);
  const [search, setSearch] = useState("");
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());
  // JOB-117 : reflète le useLinkStatus du lien "Page suivante" — voir
  // NextPagePendingBridge plus haut.
  const [isPaginating, setIsPaginating] = useState(false);

  const filteredOffers = useMemo(() => {
    return offers.filter((offer) => {
      if (city && !offer.city.toLowerCase().includes(city.toLowerCase())) return false;
      if (contractType !== CONTRACT_TYPE_ALL && offer.contractType !== contractType) return false;
      if (search) {
        const haystack = `${offer.title} ${offer.companyName}`.toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      if (selectedCampaignIds.size > 0 && !selectedCampaignIds.has(offer.campaignId)) return false;
      return true;
    });
  }, [offers, city, contractType, search, selectedCampaignIds]);

  function removeOffer(id: string) {
    setOffers((prev) => prev.filter((o) => o.id !== id));
  }

  function withPending<T>(id: string, fn: () => Promise<T>): Promise<T> {
    setPendingIds((prev) => new Set(prev).add(id));
    return fn().finally(() => {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    });
  }

  async function handleImport(id: string) {
    const result = await withPending(id, () => importHarvestedOffer({ offerId: id }));
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    removeOffer(id);
    toast.success("Offre ajoutée à votre suivi");
  }

  async function handleIgnore(id: string) {
    const result = await withPending(id, () => ignoreHarvestedOffer({ offerId: id }));
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    removeOffer(id);
  }

  // JOB : "Tout supprimer" efface la file (ou le sous-ensemble filtré) pour
  // repartir propre après avoir relancé une campagne avec de nouveaux
  // filtres — contrairement à "Passer", une offre supprimée ici n'est pas
  // exclue pour toujours : si une prochaine recherche retombe dessus, elle
  // réapparaît (suppression réelle en base, pas un simple ignoredAt).
  async function handleClearAll(): Promise<boolean> {
    const ids = filteredOffers.map((offer) => offer.id);
    const result = await clearHarvestedOffers({ offerIds: ids });
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    const idsToRemove = new Set(ids);
    setOffers((prev) => prev.filter((offer) => !idsToRemove.has(offer.id)));
    toast.success(
      `${result.data.deletedCount} offre${result.data.deletedCount > 1 ? "s" : ""} supprimée${result.data.deletedCount > 1 ? "s" : ""}`
    );
    return true;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Input
            aria-label="Filtrer par ville"
            placeholder="Ville..."
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-40"
          />
          <Select value={contractType} onValueChange={(value) => setContractType(value ?? CONTRACT_TYPE_ALL)}>
            <SelectTrigger aria-label="Filtrer par type de contrat" className="w-44">
              <SelectValue>
                {(value: string) =>
                  value === CONTRACT_TYPE_ALL
                    ? "Tous les contrats"
                    : (CAMPAIGN_CONTRACT_TYPE_LABELS[value as keyof typeof CAMPAIGN_CONTRACT_TYPE_LABELS] ?? value)
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={CONTRACT_TYPE_ALL}>Tous les contrats</SelectItem>
              {Object.entries(CAMPAIGN_CONTRACT_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            aria-label="Rechercher un titre ou une entreprise"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48"
          />
        </div>

        {filteredOffers.length > 0 && (
          <ConfirmDeleteModal
            trigger={
              <Button type="button" variant="outline" size="sm">
                Tout supprimer
              </Button>
            }
            title="Supprimer ces offres ?"
            description={`${filteredOffers.length} offre${filteredOffers.length > 1 ? "s" : ""} seront définitivement retirées de la file. Si une prochaine recherche retombe sur l'une d'elles, elle réapparaîtra ici.`}
            onConfirm={handleClearAll}
          />
        )}
      </div>

      {campaigns.length >= 2 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {campaigns.map((campaign) => {
            const selected = selectedCampaignIds.has(campaign.id);
            return (
              <Button
                key={campaign.id}
                type="button"
                variant={selected ? "default" : "outline"}
                size="xs"
                onClick={() =>
                  setSelectedCampaignIds((prev) => {
                    const next = new Set(prev);
                    if (selected) next.delete(campaign.id);
                    else next.add(campaign.id);
                    return next;
                  })
                }
              >
                {campaign.name ?? campaign.slug}
              </Button>
            );
          })}
        </div>
      )}

      {filteredOffers.length === 0 ? (
        offers.length === 0 ? (
          <div
            data-testid="review-queue-empty-state"
            className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border p-8 text-center"
          >
            <p className="flex items-center gap-2 font-heading text-lg text-heading">
              <CheckCircle2 aria-hidden="true" className="size-5 text-brand-positive" />
              Tout est à jour
            </p>
            <p className="max-w-md text-base text-muted-foreground">
              Aucune offre n&apos;attend votre revue pour le moment. Revenez
              après la prochaine recherche, ou lancez-en une manuellement
              depuis vos campagnes.
            </p>
          </div>
        ) : (
          <p className="text-base text-muted-foreground">
            Aucune offre ne correspond à ces filtres.
          </p>
        )
      ) : (
        <ul
          aria-label="Offres trouvées"
          aria-busy={isPaginating}
          className="space-y-2"
        >
          {isPaginating
            ? filteredOffers.map((offer) => <ReviewQueueCardSkeleton key={offer.id} />)
            : filteredOffers.map((offer) => {
                const pending = pendingIds.has(offer.id);
                const sourceLabel = offer.originSource
                  ? `${getSourceLabel(offer.originSource)} (${getSourceLabel(offer.source)})`
                  : getSourceLabel(offer.source);
                return (
                  <li
                    key={offer.id}
                    className="flex flex-col gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted/50 md:flex-row md:items-center md:justify-between md:gap-4"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <a
                        href={offer.applyUrl ?? offer.canonicalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-heading text-base leading-snug text-heading underline-offset-2 hover:underline"
                      >
                        {offer.title}
                      </a>
                      <p className="text-sm text-muted-foreground">
                        <span>{offer.companyName}</span> · <span>{offer.city}</span> ·{" "}
                        {formatDate(offer.postedAt)}
                      </p>
                      <Badge variant="tag">{sourceLabel}</Badge>
                    </div>
                    <span className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="accent"
                        disabled={pending}
                        onClick={() => handleImport(offer.id)}
                        className="flex-1 md:flex-none"
                      >
                        {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
                        Ajouter à mon suivi
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => handleIgnore(offer.id)}
                        className="flex-1 md:flex-none"
                      >
                        Passer
                      </Button>
                    </span>
                  </li>
                );
              })}
        </ul>
      )}

      {nextCursor && (
        <Button
          render={<Link href={`/harvester/review?cursor=${nextCursor}`} prefetch={false} />}
          nativeButton={false}
          variant="outline"
          disabled={isPaginating}
        >
          {isPaginating && <Loader2 className="animate-spin" aria-hidden="true" />}
          Page suivante
          <NextPagePendingBridge onPendingChange={setIsPaginating} />
        </Button>
      )}
    </div>
  );
}
