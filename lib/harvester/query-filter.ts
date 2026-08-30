import type { HarvestQuery } from "@/lib/harvester/harvest-query";
import type { NormalizedOffer } from "@/lib/harvester/normalized-offer";

// L'API n'accepte pas lat/lng en paramètre de recherche, seulement un code département.
// Les labels de localisation des campagnes contiennent le code postal (ex. "Lille 59000") ;
// on en extrait les deux premiers chiffres comme code département, sans filtre si absent.
// Déplacé depuis francetravail/client.ts (JOB-73) pour être réutilisé par le filtre centralisé.
export function extractDepartement(label: string): string | undefined {
  const match = label.match(/(\d{5})/);
  return match ? match[1]!.slice(0, 2) : undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesKeywords(offer: NormalizedOffer, keywords: string[]): boolean {
  if (keywords.length === 0) return true;
  const haystack = `${offer.title}\n${offer.descriptionText}`;
  return keywords.some((keyword) => new RegExp(`\\b${escapeRegExp(keyword)}\\b`, "i").test(haystack));
}

export type QueryFilterRejectionReason = "contractType" | "keywords" | "missing_department" | "department_mismatch";

export type QueryFilterResult = { matches: true } | { matches: false; reason: QueryFilterRejectionReason };

/**
 * Filet de sécurité final (JOB-73) appliqué après normalize(), pour tous les connecteurs
 * (tier0 et tier1) : une offre qui ne respecte pas contractTypes/keywords/location de la
 * requête n'est jamais persistée, même si le connecteur d'origine n'a pas de pré-filtre.
 * Ne remplace pas les pré-filtres existants côté connecteurs (utiles pour l'efficacité réseau).
 *
 * Fonction pure, sans effet de bord : c'est à l'appelant (runCampaign) de journaliser les
 * rejets — agrégés, pas un log par offre (JOB-76) — à partir de la raison retournée ici.
 */
export function offerMatchesQuery(offer: NormalizedOffer, query: HarvestQuery): QueryFilterResult {
  if (query.contractTypes.length > 0 && !query.contractTypes.includes(offer.contractType)) {
    return { matches: false, reason: "contractType" };
  }

  if (!matchesKeywords(offer, query.keywords)) {
    return { matches: false, reason: "keywords" };
  }

  const queryDepartement = extractDepartement(query.location.label);
  if (queryDepartement) {
    if (!offer.location.department) {
      // Fail-closed : sans département résolu sur l'offre (ex. Workday, dont normalize()
      // n'extrait aujourd'hui aucun département), on ne peut pas garantir le respect du filtre
      // de localisation — on exclut plutôt que d'inclure silencieusement une offre hors zone.
      return { matches: false, reason: "missing_department" };
    }
    if (offer.location.department !== queryDepartement) {
      return { matches: false, reason: "department_mismatch" };
    }
  }

  return { matches: true };
}
