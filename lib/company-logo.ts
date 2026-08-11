export function extractCompanyDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function buildClearbitLogoUrl(domain: string): string {
  return `https://logo.clearbit.com/${domain}?size=128`;
}

export function buildBrandfetchLogoUrl(
  domain: string,
  clientId: string
): string {
  return `https://cdn.brandfetch.io/${domain}/logo?c=${clientId}`;
}
