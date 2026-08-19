const FALLBACK_SLUG = "campagne";
const MAX_SLUG_LENGTH = 60;

// JOB-59 (suite) : le formulaire de campagne ne demande plus d'identifiant manuel — dérivé des
// mots-clés côté serveur. Tronqué à 60 (au lieu des 80 de slugSchema) pour laisser de la place
// à un suffixe numérique de désambiguïsation ("-2", "-3"...) en cas de collision.
export function slugifyKeywords(keywords: string[]): string {
  const slug = keywords
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/, "");

  return slug || FALLBACK_SLUG;
}
