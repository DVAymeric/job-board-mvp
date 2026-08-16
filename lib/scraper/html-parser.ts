import * as cheerio from "cheerio";
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
  const rawTitle = extractMetaContent($, "og:title") ?? extractTitleTag($);
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
