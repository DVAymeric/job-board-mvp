"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
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
        <p className="text-sm text-muted-foreground">
          {offers.length === 0
            ? "Aucune offre en attente de revue."
            : "Aucune offre ne correspond à ces filtres."}
        </p>
      ) : (
        <div role="table" aria-label="Offres collectées" className="overflow-hidden rounded-lg border border-border">
          <div role="row" className="grid grid-cols-[2rem_2fr_1.5fr_1fr_1fr_1fr_auto] items-center gap-2 border-b border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={selectedIds.size === filteredOffers.length}
              onChange={toggleAll}
              aria-label="Sélectionner toutes les offres"
            />
            <span>Titre</span>
            <span>Entreprise</span>
            <span>Ville</span>
            <span>Source</span>
            <span>Publiée</span>
            <span>Actions</span>
          </div>
          <ul>
            {filteredOffers.map((offer) => {
              const pending = pendingIds.has(offer.id);
              return (
                <li
                  key={offer.id}
                  role="row"
                  className="grid grid-cols-[2rem_2fr_1.5fr_1fr_1fr_1fr_auto] items-center gap-2 border-b border-border px-3 py-2 text-sm last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(offer.id)}
                    onChange={() => toggleOne(offer.id)}
                    aria-label={`Sélectionner ${offer.title}`}
                  />
                  <a
                    href={offer.applyUrl ?? offer.canonicalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate underline-offset-2 hover:underline"
                  >
                    {offer.title}
                  </a>
                  <span className="truncate">{offer.companyName}</span>
                  <span className="truncate">{offer.city}</span>
                  <span className="truncate">
                    <Badge variant="tag">
                      {offer.originSource ? `${offer.originSource} (${offer.source})` : offer.source}
                    </Badge>
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">{formatDate(offer.postedAt)}</span>
                  <span className="flex gap-1.5">
                    <Button size="sm" variant="accent" disabled={pending} onClick={() => handleImport(offer.id)}>
                      {pending && <Loader2 className="animate-spin" />}
                      Importer
                    </Button>
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => handleIgnore(offer.id)}>
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
