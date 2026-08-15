import * as cheerio from "cheerio";
import { splitTitleAndCompany } from "@/lib/scraper/title-company-split";

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

  if (!rawTitle) {
    return { title: null, companyName: siteName || null, descriptionText: descriptionText || null };
  }

  // Le titre affiché est toujours la version nettoyée (bruit de marque du
  // site retiré, entreprise jamais dupliquée dedans) — que l'entreprise
  // vienne d'og:site_name ou du découpage du <title> lui-même.
  const split = splitTitleAndCompany(rawTitle, url);
  return {
    title: split.title || null,
    companyName: siteName || split.companyName || null,
    descriptionText: descriptionText || null,
  };
}
