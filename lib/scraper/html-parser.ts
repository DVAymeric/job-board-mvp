import * as cheerio from "cheerio";
import { isBlockPageTitle } from "@/lib/scraper/anti-bot";
import { extractJobPostingFromJsonLd } from "@/lib/scraper/json-ld";
import { isAggregatorHostname, splitTitleAndCompany } from "@/lib/scraper/title-company-split";

function extractMetaContent($: cheerio.CheerioAPI, property: string): string | undefined {
  const content = $(`meta[property="${property}" i], meta[name="${property}" i]`)
    .first()
    .attr("content");
  const trimmed = content?.trim();
  return trimmed || undefined;
}

function extractTitleTag($: cheerio.CheerioAPI): string | undefined {
  const trimmed = $("title").first().text().trim();
  return trimmed || undefined;
}

export function extractJobMetadataFromHtml(
  html: string,
  url: string
): {
  title: string | null;
  companyName: string | null;
  descriptionText: string | null;
} {
  const $ = cheerio.load(html);
  const titleCandidate = extractMetaContent($, "og:title") ?? extractTitleTag($);
  // Une page de blocage anti-bot (Indeed, Cloudflare...) répond parfois avec
  // un statut 200 et un <title> qui n'est que ce message d'interstitiel — y
  // compris à l'issue du fallback Playwright, lui aussi détectable comme
  // navigateur headless. Sans ce filtre ce texte serait accepté tel quel
  // comme titre de poste.
  const rawTitle =
    titleCandidate && !isBlockPageTitle(titleCandidate) ? titleCandidate : undefined;
  const siteName = extractMetaContent($, "og:site_name");
  const descriptionText =
    extractMetaContent($, "og:description") ?? extractMetaContent($, "description");

  // Standard schema.org/JobPosting (indexation Google for Jobs) : priorité
  // absolue sur `hiringOrganization.name`, seule source fiable de
  // l'employeur réel sur un agrégateur multi-employeurs — contrairement à
  // og:site_name, qui y vaut toujours le nom de la plateforme (JOB-parsing).
  const jsonLd = extractJobPostingFromJsonLd($);

  const split = rawTitle ? splitTitleAndCompany(rawTitle, url) : null;
  // Sur un agrégateur connu (HelloWork, Meteojob, Indeed, LinkedIn, WTTJ...),
  // og:site_name est structurellement le nom du site, jamais celui de
  // l'entreprise qui recrute — un site carrière direct peut légitimement
  // avoir og:site_name = nom de l'entreprise, donc la règle ne s'applique
  // qu'aux domaines agrégateurs connus.
  const siteNameAsCompany = isAggregatorHostname(url) ? null : siteName || null;

  return {
    title: jsonLd?.title || split?.title || null,
    companyName: jsonLd?.companyName || siteNameAsCompany || split?.companyName || null,
    descriptionText: descriptionText || null,
  };
}
