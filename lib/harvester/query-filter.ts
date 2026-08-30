import type { HarvestQuery } from "@/lib/harvester/harvest-query";
import type { NormalizedOffer } from "@/lib/harvester/normalized-offer";
import { departmentFromPostalCode } from "@/lib/harvester/department-from-postal-code";

// L'API n'accepte pas lat/lng en paramètre de recherche, seulement un code département.
// Les labels de localisation des campagnes contiennent le code postal (ex. "Lille 59000") ;
// on en extrait les deux premiers chiffres comme code département, sans filtre si absent.
// Déplacé depuis francetravail/client.ts (JOB-73) pour être réutilisé par le filtre centralisé.
// Distinct de departmentFromLabel (ci-dessous) : francetravail garde sa version simplifiée
// (slice(0,2) systématique, pas de gestion DOM/TOM), hors scope du fix JOB-75/77.
export function extractDepartement(label: string): string | undefined {
  const match = label.match(/(\d{5})/);
  return match ? match[1]!.slice(0, 2) : undefined;
}

// Même heuristique que extractDepartement (code postal 5 chiffres dans le label), mais
// réutilise departmentFromPostalCode pour gérer correctement les départements DOM/TOM à 3
// chiffres — utilisée par la cascade de localisation ci-dessous (JOB-75/77).
export function departmentFromLabel(label: string): string | undefined {
  const match = label.match(/(\d{5})/);
  return match ? departmentFromPostalCode(match[1]!) : undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesKeywords(offer: NormalizedOffer, keywords: string[]): boolean {
  if (keywords.length === 0) return true;
  const haystack = `${offer.title}\n${offer.descriptionText}`;
  return keywords.some((keyword) => new RegExp(`\\b${escapeRegExp(keyword)}\\b`, "i").test(haystack));
}

export interface AcceptableLocation {
  label: string;
  lat: number;
  lng: number;
  radiusKm: number;
}

// Calculé une fois par runCampaign(), à partir de TOUTES les localisations de la campagne —
// pas de la query d'une seule itération de boucle sur les localisations : un connecteur
// locationScoped:false n'est fetché qu'une fois avec la première localisation, ses offres
// doivent quand même pouvoir matcher n'importe laquelle des localisations de la campagne
// (JOB-75/77).
export function acceptableLocationsFromLocations(
  locations: { label: string; lat: number; lng: number; radiusKm: number }[],
): AcceptableLocation[] {
  return locations.map((location) => ({ label: location.label, lat: location.lat, lng: location.lng, radiusKm: location.radiusKm }));
}

function cityFromLabel(label: string): string {
  return label.replace(/\d{5}/g, "").trim();
}

// Même idiome de repli accents/casse que normalizeCompanyName (lib/harvester/company-name.ts).
function normalizeCityName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

const EARTH_RADIUS_KM = 6371;
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

// Distance orthodromique entre l'offre et une localisation de campagne, pour comparer au rayon
// déclaré (radiusKm) plutôt qu'à l'égalité stricte de département — un rayon de 30km autour de
// Lille déborde légitimement sur les départements voisins (62, 80).
export function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

export type LocationVerdict = "matched" | "out-of-zone" | "unresolved";

// JOB-75/77 : cascade à 3 niveaux, du plus fiable au plus grossier.
//  1. Rayon géographique (haversine) si l'offre porte ses propres coordonnées (welcometothejungle,
//     labonnealternance) — l'égalité stricte de département rejetait à tort des offres pourtant
//     dans le rayon déclaré mais situées dans un département voisin.
//  2. Égalité de département si l'offre n'a pas de coordonnées mais un département résolu
//     (francetravail, smartrecruiters, talentsoft, digitalrecruiters).
//  3. Correspondance par nom de ville normalisé (accents/casse) contre les libellés des
//     localisations acceptables, en dernier recours — nécessaire pour workday, qui n'expose ni
//     coordonnées ni code postal, seulement un nom de ville libre. Une ville non vide EST une
//     information exploitable : si elle ne correspond à aucune localisation, c'est "out-of-zone"
//     (rejet normal), pas "unresolved" (fail-closed générique avec warning).
// Fail-closed ("unresolved") uniquement si aucun des trois niveaux ne permet de trancher.
export function resolveLocationVerdict(offer: NormalizedOffer, acceptable: AcceptableLocation[]): LocationVerdict {
  if (acceptable.length === 0) return "matched";

  if (offer.location.lat !== undefined && offer.location.lng !== undefined) {
    const withinRadius = acceptable.some(
      (location) => haversineDistanceKm(offer.location.lat!, offer.location.lng!, location.lat, location.lng) <= location.radiusKm,
    );
    return withinRadius ? "matched" : "out-of-zone";
  }

  if (offer.location.department) {
    const acceptableDepartments = new Set(
      acceptable.map((location) => departmentFromLabel(location.label)).filter((department): department is string => department !== undefined),
    );
    if (acceptableDepartments.size > 0) {
      return acceptableDepartments.has(offer.location.department) ? "matched" : "out-of-zone";
    }
  }

  const offerCity = offer.location.city ? normalizeCityName(offer.location.city) : "";
  if (offerCity) {
    const acceptableCities = new Set(acceptable.map((location) => normalizeCityName(cityFromLabel(location.label))));
    return acceptableCities.has(offerCity) ? "matched" : "out-of-zone";
  }

  return "unresolved";
}

export type QueryFilterRejectionReason = "contractType" | "keywords" | "location_unresolved" | "location_out_of_zone";

export type QueryFilterResult = { matches: true } | { matches: false; reason: QueryFilterRejectionReason };

/**
 * Filet de sécurité final (JOB-73) appliqué après normalize(), pour tous les connecteurs
 * (tier0 et tier1) : une offre qui ne respecte pas contractTypes/keywords/location de la
 * campagne n'est jamais persistée, même si le connecteur d'origine n'a pas de pré-filtre.
 * Ne remplace pas les pré-filtres existants côté connecteurs (utiles pour l'efficacité réseau).
 *
 * `acceptableLocations` est dérivé de TOUTES les localisations de la campagne (pas de la seule
 * query de l'itération de boucle courante) — voir acceptableLocationsFromLocations (JOB-75/77).
 *
 * Fonction pure, sans effet de bord : c'est à l'appelant (runCampaign) de journaliser les
 * rejets — agrégés, pas un log par offre (JOB-76) — à partir de la raison retournée ici.
 */
export function offerMatchesQuery(offer: NormalizedOffer, query: HarvestQuery, acceptableLocations: AcceptableLocation[]): QueryFilterResult {
  if (query.contractTypes.length > 0 && !query.contractTypes.includes(offer.contractType)) {
    return { matches: false, reason: "contractType" };
  }

  if (!matchesKeywords(offer, query.keywords)) {
    return { matches: false, reason: "keywords" };
  }

  const verdict = resolveLocationVerdict(offer, acceptableLocations);
  if (verdict === "unresolved") {
    return { matches: false, reason: "location_unresolved" };
  }
  if (verdict === "out-of-zone") {
    return { matches: false, reason: "location_out_of_zone" };
  }

  return { matches: true };
}
