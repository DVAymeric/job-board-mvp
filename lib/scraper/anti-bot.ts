// Certains agrégateurs (Indeed en tête) répondent à un scraping détecté par
// une page interstitielle dont le titre HTML ne contient rien d'autre que ce
// message de blocage — y compris quand la requête aboutit avec un statut
// 200 (challenge JS) ou survit au fallback Playwright (le challenge peut
// aussi détecter un navigateur headless). Sans ce filtre, ce texte de
// blocage est accepté tel quel comme titre de poste.
const BLOCK_PAGE_TITLES = [
  "blocked",
  "access denied",
  "attention required",
  "just a moment",
  "are you a human",
  "are you a robot",
  "403 forbidden",
  "unusual traffic",
  "verify you are human",
  "checking your browser",
  "sorry, you have been blocked",
];

export function isBlockPageTitle(title: string): boolean {
  const normalized = title.trim().toLowerCase();
  return BLOCK_PAGE_TITLES.some((pattern) => normalized.startsWith(pattern));
}
