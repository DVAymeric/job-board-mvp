import { safeFetch } from "@/lib/safe-fetch";

const BASE_URL = "https://api-adresse.data.gouv.fr/search/";
const GEOCODE_TIMEOUT_MS = 5000;

// `type` plutôt qu'`interface` : cette forme est stockée dans Campaign.config (Prisma Json) —
// une interface n'obtient pas implicitement de signature d'index, ce que Prisma.InputJsonValue
// exige structurellement.
export type GeocodedCity = {
  label: string;
  lat: number;
  lng: number;
};

interface BanFeature {
  geometry: { coordinates: [number, number] };
  properties: { label?: string; postcode?: string };
}

// JOB-59 (suite) : le formulaire de campagne ne demande plus qu'un nom de ville — lat/lng sont
// résolus ici via la Base Adresse Nationale (api-adresse.data.gouv.fr, gratuite, sans clé),
// toujours nécessaires en interne pour les connecteurs dont l'API tierce exige des coordonnées
// (LBA, WTTJ). `type=municipality` restreint aux communes, pas aux adresses précises.
export async function geocodeCity(query: string): Promise<GeocodedCity | null> {
  const url = new URL(BASE_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("type", "municipality");
  url.searchParams.set("limit", "1");

  const response = await safeFetch(url.toString(), { signal: AbortSignal.timeout(GEOCODE_TIMEOUT_MS) });
  if (!response || !response.ok) return null;

  const data = (await response.json()) as { features?: BanFeature[] };
  const feature = data.features?.[0];
  if (!feature) return null;

  const [lng, lat] = feature.geometry.coordinates;
  const bareLabel = feature.properties.label ?? query;
  // La BAN renvoie `postcode` séparément de `label` pour une recherche `type=municipality`
  // ("Amiens" / "80000", jamais "Amiens 80000" dans le label lui-même) — on l'ajoute ici pour
  // que les consommateurs en aval qui dérivent un département en cherchant un code postal DANS
  // le label (France Travail : extractDepartement, query-filter.ts) puissent le faire. Sans ça,
  // toute campagne créée depuis le formulaire (qui ne demande qu'un nom de ville, JOB-59)
  // échouait en direct sur France Travail avec "impossible d'extraire un code postal".
  const label = feature.properties.postcode ? `${bareLabel} ${feature.properties.postcode}` : bareLabel;
  return { label, lat, lng };
}

export interface LocationInput {
  label: string;
  radiusKm: number;
}

export type ResolvedLocation = GeocodedCity & {
  radiusKm: number;
};

export type ResolveLocationsResult =
  | { ok: true; locations: ResolvedLocation[] }
  | { ok: false; unresolvedLabel: string };

// Séquentiel plutôt que Promise.all : une campagne a rarement plus de 2-3 localisations, et le
// traitement séquentiel permet de rapporter précisément QUELLE ville n'a pas pu être résolue.
export async function resolveLocations(inputs: LocationInput[]): Promise<ResolveLocationsResult> {
  const locations: ResolvedLocation[] = [];
  for (const input of inputs) {
    const geocoded = await geocodeCity(input.label);
    if (!geocoded) {
      return { ok: false, unresolvedLabel: input.label };
    }
    locations.push({ ...geocoded, radiusKm: input.radiusKm });
  }
  return { ok: true, locations };
}
