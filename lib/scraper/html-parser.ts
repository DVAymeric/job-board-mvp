import * as cheerio from "cheerio";

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

export function extractJobMetadataFromHtml(html: string): {
  title: string | null;
  companyName: string | null;
  descriptionText: string | null;
} {
  const $ = cheerio.load(html);
  const title = extractMetaContent($, "og:title") ?? extractTitleTag($);
  const companyName = extractMetaContent($, "og:site_name");
  const descriptionText =
    extractMetaContent($, "og:description") ?? extractMetaContent($, "description");
  return {
    title: title || null,
    companyName: companyName || null,
    descriptionText: descriptionText || null,
  };
}
