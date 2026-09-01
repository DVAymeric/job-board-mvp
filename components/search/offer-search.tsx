"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { SearchForm, type SearchCriteria } from "@/components/search/search-form";
import { JobResultRow, type JobResult } from "@/components/search/job-result-row";
import { Button } from "@/components/ui/button";

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
  signedOut,
  initialCriteria,
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
  /**
   * JOB-138 : le Harvester reste un modèle par utilisateur (JOB-136) — un
   * visiteur non connecté n'a par construction aucune offre personnelle.
   * `offers` est alors toujours vide ; ce indicateur distingue ce cas d'un
   * vrai "aucun résultat pour vos critères" pour ne jamais laisser un
   * visiteur croire que ses filtres sont trop stricts alors qu'il n'y a
   * simplement encore aucune alerte associée à son compte.
   */
  signedOut?: boolean;
  /**
   * JOB-139 : critères déjà saisis sur la hero de la homepage, transmis via
   * la query string de la redirection vers `/recherche`, pour que la
   * recherche s'applique immédiatement plutôt que de retomber sur un
   * formulaire vide après la navigation.
   */
  initialCriteria?: SearchCriteria;
}) {
  const [criteria, setCriteria] = useState<SearchCriteria>(initialCriteria ?? EMPTY_CRITERIA);
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
      <SearchForm onSearch={setCriteria} initialCriteria={initialCriteria} />
      {signedOut ? (
        <div
          data-testid="offer-search-signed-out"
          className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-8 text-center"
        >
          <p className="font-heading text-lg text-heading">Créez votre alerte pour voir des offres</p>
          <p className="max-w-md text-base text-muted-foreground">
            Les offres affichées ici viennent des alertes emploi que vous créez. Connectez-vous
            ou créez un compte gratuit pour lancer la vôtre et voir ce qu&apos;elle trouve.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button render={<Link href="/register" prefetch={false} />} nativeButton={false}>
              Créer un compte gratuit
            </Button>
            <Button
              variant="outline"
              render={<Link href="/login" prefetch={false} />}
              nativeButton={false}
            >
              Se connecter
            </Button>
          </div>
        </div>
      ) : loadError ? (
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
