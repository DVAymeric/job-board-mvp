const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  "#39": "'",
  nbsp: " ",
};

function decodeHtmlEntities(value: string): string {
  return value.replace(/&([a-zA-Z]+|#\d+);/g, (match, entity: string) => {
    if (entity in HTML_ENTITIES) return HTML_ENTITIES[entity];
    if (entity.startsWith("#")) {
      const codePoint = Number(entity.slice(1));
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    return match;
  });
}

function extractMetaContent(html: string, property: string): string | undefined {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const propMatch = tag.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i);
    if (!propMatch || propMatch[1].toLowerCase() !== property) continue;
    const contentMatch = tag.match(/content\s*=\s*["']([^"']*)["']/i);
    if (contentMatch) return decodeHtmlEntities(contentMatch[1]).trim();
  }
  return undefined;
}

function extractTitleTag(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeHtmlEntities(match[1]).trim() : undefined;
}

export function extractJobMetadataFromHtml(html: string): {
  title: string | null;
  companyName: string | null;
} {
  const title = extractMetaContent(html, "og:title") ?? extractTitleTag(html);
  const companyName = extractMetaContent(html, "og:site_name");
  return {
    title: title || null,
    companyName: companyName || null,
  };
}
