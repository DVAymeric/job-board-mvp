export type TitleCompanySplit = {
  title: string;
  companyName: string | null;
};

// Mots-clés de type de contrat utilisés par Welcome to the Jungle en fin de
// <title> ("... - Entreprise - CDI à Ville") — ancre fiable pour isoler
// l'entreprise même quand le titre du poste contient lui-même des tirets.
const WTTJ_CONTRACT_KEYWORDS = "CDI|CDD|Freelance|Stage|Alternance|Apprentissage|Intérim|VIE";

/**
 * Indeed ne fournit ni og:site_name ni JSON-LD JobPosting en HTML statique,
 * et le <title> n'a aucun marqueur fiable distinguant l'entreprise du reste
 * — elle apparaît parfois en tête ("Acme - Développeur - Ville - Indeed.com"),
 * parfois pas du tout ("Développeur - Ville - Indeed.com"). Deviner à moitié
 * faux est pire que laisser vide : on retire seulement le bruit de marque
 * ("- Indeed.com") sans jamais tenter d'extraire l'entreprise.
 */
function splitIndeedTitle(raw: string): TitleCompanySplit {
  const title = raw.replace(/\s*[-|]\s*Indeed(?:\.com)?\s*$/i, "").trim();
  return { title, companyName: null };
}

/**
 * LinkedIn : format cohérent "<Entreprise> recrute pour des postes de
 * <Titre> (<Lieu>) | LinkedIn". Le groupe entre parenthèses juste avant
 * "| LinkedIn" est le lieu (pas le titre) — mais le titre peut lui-même
 * contenir des parenthèses (ex. "(Node.js/PHP)") : on ne retire que ce
 * dernier groupe, ancré juste avant "| LinkedIn", jamais les précédents.
 */
function splitLinkedInTitle(raw: string): TitleCompanySplit {
  let cleaned = raw.replace(/\s*\([^()]*\)\s*\|\s*LinkedIn\s*$/i, "");
  if (cleaned === raw) {
    cleaned = raw.replace(/\s*\|\s*LinkedIn\s*$/i, "");
  }
  cleaned = cleaned.trim();

  const match = cleaned.match(
    /^(.+?)\s+recrute\s+(?:pour des postes de|pour un poste de|un(?:·e)?|une?)\s+(.+)$/i
  );
  if (match) {
    return { title: match[2].trim(), companyName: match[1].trim() };
  }
  return { title: cleaned, companyName: null };
}

/**
 * Welcome to the Jungle : format "<Titre> - <Entreprise> - <Contrat> à
 * <Lieu>". Le titre contient très souvent lui-même des tirets ("Développeur
 * iOS - Confirmé - (H/F) - Entreprise - CDI à Paris") : on ancre donc sur le
 * mot-clé de contrat final plutôt que sur la position d'un tiret.
 */
function splitWttjTitle(raw: string): TitleCompanySplit {
  const pattern = new RegExp(
    `^(.+?)\\s-\\s([^-]+?)\\s-\\s(?:${WTTJ_CONTRACT_KEYWORDS})\\b`,
    "i"
  );
  const match = raw.match(pattern);
  if (match) {
    return { title: match[1].trim(), companyName: match[2].trim() };
  }
  return { title: raw, companyName: null };
}

/**
 * Site inconnu : seuls les mots-clés directionnels ("chez", "recrute")
 * indiquent sans ambiguïté quel côté est l'entreprise, quel que soit le
 * site — contrairement à un simple séparateur (-, |, :) dont l'ordre
 * poste/entreprise varie d'un site à l'autre et ne peut pas être deviné de
 * façon fiable.
 */
function splitGenericTitle(raw: string): TitleCompanySplit {
  const chezMatch = raw.match(/^(.+?)\s+chez\s+(.+)$/i);
  if (chezMatch) {
    return { title: chezMatch[1].trim(), companyName: chezMatch[2].trim() };
  }
  const recruteMatch = raw.match(/^(.+?)\s+recrute\s+(?:un(?:·e)?|une?)?\s*(.+)$/i);
  if (recruteMatch) {
    return { title: recruteMatch[2].trim(), companyName: recruteMatch[1].trim() };
  }
  return { title: raw, companyName: null };
}

/**
 * Sépare titre de poste et nom d'entreprise à partir du <title> brut d'une
 * page d'offre, avec des règles par site (Indeed, LinkedIn, Welcome to the
 * Jungle) plutôt qu'une regex générique unique — l'ordre poste/entreprise
 * et les séparateurs varient trop d'un site à l'autre pour être devinés de
 * façon fiable sans connaître le site.
 */
export function splitTitleAndCompany(rawTitle: string, url: string): TitleCompanySplit {
  const title = rawTitle.trim();
  let hostname = "";
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    hostname = "";
  }

  if (hostname.includes("indeed.")) return splitIndeedTitle(title);
  if (hostname.includes("linkedin.")) return splitLinkedInTitle(title);
  if (hostname.includes("welcometothejungle.")) return splitWttjTitle(title);
  return splitGenericTitle(title);
}
