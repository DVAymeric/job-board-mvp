"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { HarvestedOffer } from "@prisma/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { importHarvestedOffer, ignoreHarvestedOffer } from "@/app/actions/harvest";
import { CAMPAIGN_CONTRACT_TYPE_LABELS } from "@/lib/harvester/campaign-validation";

function formatDate(value: string | null): string {
  return value ? value.slice(0, 10) : "—";
}

export function ReviewQueueManager({
  initialOffers,
  nextCursor,
}: {
  initialOffers: HarvestedOffer[];
  nextCursor: string | null;
}) {
  const [offers, setOffers] = useState(initialOffers);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [city, setCity] = useState("");
  const [contractType, setContractType] = useState("");
  const [search, setSearch] = useState("");

  const filteredOffers = useMemo(() => {
    return offers.filter((offer) => {
      if (city && !offer.city.toLowerCase().includes(city.toLowerCase())) return false;
      if (contractType && offer.contractType !== contractType) return false;
      if (search) {
        const haystack = `${offer.title} ${offer.companyName}`.toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [offers, city, contractType, search]);

  function removeOffer(id: string) {
    setOffers((prev) => prev.filter((o) => o.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
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
    toast.success("Offre importée vers le board");
  }

  async function handleIgnore(id: string) {
    const result = await withPending(id, () => ignoreHarvestedOffer({ offerId: id }));
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    removeOffer(id);
  }

  async function handleBulkImport() {
    const ids = [...selectedIds];
    for (const id of ids) {
      await handleImport(id);
    }
  }

  async function handleBulkIgnore() {
    const ids = [...selectedIds];
    for (const id of ids) {
      await handleIgnore(id);
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds((prev) =>
      prev.size === filteredOffers.length ? new Set() : new Set(filteredOffers.map((o) => o.id))
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Input
          aria-label="Filtrer par ville"
          placeholder="Ville..."
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-40"
        />
        <select
          aria-label="Filtrer par type de contrat"
          value={contractType}
          onChange={(e) => setContractType(e.target.value)}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          <option value="">Tous les contrats</option>
          {Object.entries(CAMPAIGN_CONTRACT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <Input
          aria-label="Rechercher un titre ou une entreprise"
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-48"
        />
      </div>

      {selectedIds.size > 0 && (
        <div
          role="toolbar"
          aria-label="Actions groupées"
          className="flex items-center gap-2 rounded-lg border border-primary bg-muted px-3 py-2 text-sm"
        >
          <span aria-live="polite">{selectedIds.size} offre(s) sélectionnée(s)</span>
          <Button size="sm" variant="accent" onClick={handleBulkImport}>
            Importer la sélection
          </Button>
          <Button size="sm" variant="outline" onClick={handleBulkIgnore}>
            Ignorer la sélection
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            Désélectionner
          </Button>
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
              après la prochaine collecte, ou lancez-en une manuellement
              depuis les campagnes.
            </p>
          </div>
        ) : (
          <p className="text-base text-muted-foreground">
            Aucune offre ne correspond à ces filtres.
          </p>
        )
      ) : (
        <div role="table" aria-label="Offres collectées" className="overflow-hidden rounded-lg border border-border">
          {/* Sous md: (JOB-111) seule la case « tout sélectionner » reste
              visible dans l'en-tête — les libellés de colonnes (Titre,
              Entreprise...) n'ont plus de sens une fois les lignes empilées
              en carte, ils réapparaissent dès que la grille à 7 colonnes
              revient à md:. */}
          <div role="row" className="flex items-center gap-2 border-b border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground md:grid md:grid-cols-[2rem_2fr_1.5fr_1fr_1fr_1fr_auto]">
            <input
              type="checkbox"
              checked={selectedIds.size === filteredOffers.length}
              onChange={toggleAll}
              aria-label="Sélectionner toutes les offres"
            />
            <span className="hidden md:inline">Titre</span>
            <span className="hidden md:inline">Entreprise</span>
            <span className="hidden md:inline">Ville</span>
            <span className="hidden md:inline">Source</span>
            <span className="hidden md:inline">Publiée</span>
            <span className="hidden md:inline">Actions</span>
          </div>
          <ul>
            {filteredOffers.map((offer) => {
              const pending = pendingIds.has(offer.id);
              return (
                <li
                  key={offer.id}
                  role="row"
                  className="flex flex-col gap-2 border-b border-border p-3 text-sm transition-colors last:border-b-0 hover:bg-muted/50 md:grid md:grid-cols-[2rem_2fr_1.5fr_1fr_1fr_1fr_auto] md:items-center md:gap-2 md:px-3 md:py-2"
                >
                  {/* Case à cocher + titre groupés pour l'empilement mobile ;
                      md:contents (JOB-111) fait disparaître ce wrapper de la
                      grille pour que ses 2 enfants redeviennent des cellules
                      directes de md:grid-cols-[2rem_2fr_...], comme avant. */}
                  <div className="flex items-start gap-2 md:contents">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(offer.id)}
                      onChange={() => toggleOne(offer.id)}
                      aria-label={`Sélectionner ${offer.title}`}
                      className="mt-1 shrink-0 md:mt-0"
                    />
                    <a
                      href={offer.applyUrl ?? offer.canonicalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 flex-1 underline-offset-2 hover:underline md:truncate"
                    >
                      {offer.title}
                    </a>
                  </div>
                  {/* Entreprise/Ville/Source/Date regroupées en ligne meta
                      empilée sous md: ; md:contents les rend de nouveau
                      individuelles pour les 4 colonnes de la grille desktop. */}
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 pl-6 md:contents md:pl-0">
                    <span className="truncate">{offer.companyName}</span>
                    <span className="truncate">{offer.city}</span>
                    <span className="truncate">
                      <Badge variant="tag">
                        {offer.originSource ? `${offer.originSource} (${offer.source})` : offer.source}
                      </Badge>
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">{formatDate(offer.postedAt)}</span>
                  </div>
                  <span className="flex gap-1.5 pl-6 md:pl-0">
                    <Button
                      size="sm"
                      variant="accent"
                      disabled={pending}
                      onClick={() => handleImport(offer.id)}
                      className="flex-1 md:flex-none"
                    >
                      {pending && <Loader2 className="animate-spin" />}
                      Importer
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => handleIgnore(offer.id)}
                      className="flex-1 md:flex-none"
                    >
                      Ignorer
                    </Button>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {nextCursor && (
        <Button
          render={<Link href={`/harvester/review?cursor=${nextCursor}`} prefetch={false} />}
          nativeButton={false}
          variant="outline"
        >
          Page suivante
        </Button>
      )}
    </div>
  );
}
