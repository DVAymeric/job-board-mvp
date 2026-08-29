"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SearchForm, type SearchCriteria } from "@/components/search/search-form";
import { JobResultRow, type JobResult } from "@/components/search/job-result-row";

export interface SearchableOffer {
  result: JobResult;
  keywordHaystack: string;
  locationHaystack: string;
  rawContractType: string;
}

const EMPTY_CRITERIA: SearchCriteria = { keyword: "", location: "", contractType: "" };

export function OfferSearch({
  offers,
  loadError,
}: {
  offers: SearchableOffer[];
  /**
   * Message d'erreur (déjà en langage clair, non technique) quand le
   * chargement des offres côté serveur a échoué (JOB-116) — voir
   * `getSearchableOffers` dans `lib/search/offers.ts`. Le formulaire de
   * recherche reste monté et utilisable, les critères déjà saisis ne sont
   * jamais perdus : cette prop ne remplace que la liste de résultats par un
   * message, jamais tout l'arbre du composant.
   */
  loadError?: string;
}) {
  const [criteria, setCriteria] = useState<SearchCriteria>(EMPTY_CRITERIA);
  const loadErrorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loadError) {
      loadErrorRef.current?.focus();
    }
  }, [loadError]);

  const filtered = useMemo(() => {
    const keyword = criteria.keyword.trim().toLowerCase();
    const location = criteria.location.trim().toLowerCase();

    return offers.filter((offer) => {
      if (keyword && !offer.keywordHaystack.includes(keyword)) return false;
      if (location && !offer.locationHaystack.includes(location)) return false;
      if (criteria.contractType && offer.rawContractType !== criteria.contractType) return false;
      return true;
    });
  }, [offers, criteria]);

  return (
    <div className="space-y-4">
      <SearchForm onSearch={setCriteria} />
      {loadError ? (
        <div
          ref={loadErrorRef}
          role="alert"
          tabIndex={-1}
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-base text-destructive outline-none"
        >
          {loadError}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-base text-muted-foreground">
          Aucune offre ne correspond à votre recherche. Essayez d&apos;élargir la zone
          géographique ou de changer de mot-clé.
        </p>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border">
          {filtered.map((offer) => (
            <JobResultRow key={offer.result.id} result={offer.result} />
          ))}
        </div>
      )}
    </div>
  );
}
