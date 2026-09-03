import { trigramSimilarity } from "@/lib/harvester/similarity";
import referentiel from "@/lib/harvester/rome-referentiel.json";

export interface MetierMatch {
  libelle: string;
  romeCode: string;
  score: number;
}

const MIN_QUERY_LENGTH = 2;

// Même idiome de normalisation (minuscules + suppression des diacritiques) que
// query-filter.ts (stripDiacritics) et merge.ts/company-name.ts (normalizeCompanyName) — pas
// une nouvelle règle, la troisième occurrence de ce même motif court dans lib/harvester.
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

const normalizedReferentiel = (referentiel as { libelle: string; code: string }[]).map((entry) => ({
  libelle: entry.libelle,
  romeCode: entry.code,
  normalizedLibelle: normalize(entry.libelle),
}));

export function searchRomeReferentiel(query: string, limit = 8): MetierMatch[] {
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY_LENGTH) return [];

  const normalizedQuery = normalize(trimmed);
  const scored: MetierMatch[] = [];
  for (const entry of normalizedReferentiel) {
    const score = trigramSimilarity(normalizedQuery, entry.normalizedLibelle);
    if (score > 0) {
      scored.push({ libelle: entry.libelle, romeCode: entry.romeCode, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
