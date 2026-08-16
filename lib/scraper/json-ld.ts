import type * as cheerio from "cheerio";

export type JobPostingJsonLd = {
  title: string | null;
  companyName: string | null;
  companyLogo: string | null;
  jobLocation: string | null;
  datePosted: string | null;
  employmentType: string | null;
};

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function extractHiringOrganizationName(hiringOrganization: unknown): string | null {
  if (typeof hiringOrganization === "string") return toNonEmptyString(hiringOrganization);
  if (hiringOrganization && typeof hiringOrganization === "object") {
    return toNonEmptyString((hiringOrganization as { name?: unknown }).name);
  }
  return null;
}

function extractLogo(hiringOrganization: unknown): string | null {
  if (!hiringOrganization || typeof hiringOrganization !== "object") return null;
  const logo = (hiringOrganization as { logo?: unknown }).logo;
  if (typeof logo === "string") return toNonEmptyString(logo);
  if (logo && typeof logo === "object") {
    return toNonEmptyString((logo as { url?: unknown }).url);
  }
  return null;
}

function extractJobLocation(jobLocation: unknown): string | null {
  const place = Array.isArray(jobLocation) ? jobLocation[0] : jobLocation;
  if (!place || typeof place !== "object") return null;
  const address = (place as { address?: unknown }).address;
  if (!address || typeof address !== "object") return null;
  return toNonEmptyString((address as { addressLocality?: unknown }).addressLocality);
}

function extractEmploymentType(employmentType: unknown): string | null {
  if (Array.isArray(employmentType)) {
    const joined = employmentType.filter((v) => typeof v === "string").join(", ");
    return toNonEmptyString(joined);
  }
  return toNonEmptyString(employmentType);
}

function hasJobPostingType(node: unknown): node is Record<string, unknown> {
  if (!node || typeof node !== "object") return false;
  const type = (node as { "@type"?: unknown })["@type"];
  if (typeof type === "string") return type === "JobPosting";
  if (Array.isArray(type)) return type.includes("JobPosting");
  return false;
}

function flattenJsonLdCandidates(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") {
    const graph = (parsed as { "@graph"?: unknown })["@graph"];
    if (Array.isArray(graph)) return graph;
    return [parsed];
  }
  return [];
}

function parseJobPosting(node: Record<string, unknown>): JobPostingJsonLd {
  return {
    title: toNonEmptyString(node.title),
    companyName: extractHiringOrganizationName(node.hiringOrganization),
    companyLogo: extractLogo(node.hiringOrganization),
    jobLocation: extractJobLocation(node.jobLocation),
    datePosted: toNonEmptyString(node.datePosted),
    employmentType: extractEmploymentType(node.employmentType),
  };
}

/**
 * Standard schema.org/JobPosting utilisé par la plupart des sites d'offres
 * pour l'indexation Google for Jobs — présent dans le HTML statique (pas
 * besoin de rendu JS), et bien plus fiable qu'un parsing de texte libre pour
 * `hiringOrganization.name` : contrairement à `og:site_name`, ce champ vaut
 * l'employeur réel même sur un agrégateur multi-employeurs.
 */
export function extractJobPostingFromJsonLd($: cheerio.CheerioAPI): JobPostingJsonLd | null {
  const scripts = $('script[type="application/ld+json"]').toArray();

  for (const script of scripts) {
    const raw = $(script).contents().text();
    if (!raw.trim()) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }

    for (const candidate of flattenJsonLdCandidates(parsed)) {
      if (hasJobPostingType(candidate)) {
        const result = parseJobPosting(candidate);
        if (result.title || result.companyName) return result;
      }
    }
  }

  return null;
}
