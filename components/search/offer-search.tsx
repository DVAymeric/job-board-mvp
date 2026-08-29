"use client";

import { useMemo, useState } from "react";
import { SearchForm, type SearchCriteria } from "@/components/search/search-form";
import { JobResultRow, type JobResult } from "@/components/search/job-result-row";

export interface SearchableOffer {
  result: JobResult;
  keywordHaystack: string;
  locationHaystack: string;
  rawContractType: string;
}

const EMPTY_CRITERIA: SearchCriteria = { keyword: "", location: "", contractType: "" };

export function OfferSearch({ offers }: { offers: SearchableOffer[] }) {
  const [criteria, setCriteria] = useState<SearchCriteria>(EMPTY_CRITERIA);

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
      {filtered.length === 0 ? (
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
