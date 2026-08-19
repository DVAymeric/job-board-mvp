import { canonicalizeUrl } from "@/lib/harvester/canonicalize";
import { exactDedupKeyFromSource, exactDedupKeyFromUrl } from "@/lib/harvester/dedup-key";
import { normalizeCompanyName } from "@/lib/harvester/company-name";
import { stripHtml } from "@/lib/harvester/strip-html";
import { inferContractTypeFromText } from "@/lib/harvester/infer-contract-type";
import { departmentFromPostalCode } from "@/lib/harvester/department-from-postal-code";
import type { NormalizedOffer } from "@/lib/harvester/normalized-offer";
import type { RawOffer } from "@/lib/harvester/harvest-query";
import { JsonLdRawOfferSchema } from "@/lib/harvester/connectors/jsonld-generic/types";
import { JSONLD_GENERIC_CONNECTOR_ID } from "@/lib/harvester/connectors/jsonld-generic/client";

function sourceOfferIdFromUrl(url: string): string {
  const { pathname } = new URL(url);
  return pathname !== "/" ? pathname : url;
}

export function normalizeJsonLdOffer(raw: RawOffer): NormalizedOffer {
  const parsed = JsonLdRawOfferSchema.parse(raw.payload);
  const { pageUrl, jobPosting } = parsed;

  const applyUrl = jobPosting.url ?? pageUrl;
  const canonicalUrl = canonicalizeUrl(applyUrl);
  const now = new Date().toISOString();
  const companyName = jobPosting.hiringOrganization?.name ?? "Entreprise inconnue";
  const descriptionText = stripHtml(jobPosting.description);
  const city = jobPosting.jobLocation?.address?.addressLocality ?? "";
  const postalCode = jobPosting.jobLocation?.address?.postalCode;
  const sourceOfferId = jobPosting.identifier?.value ?? sourceOfferIdFromUrl(canonicalUrl);
  const employmentType = Array.isArray(jobPosting.employmentType)
    ? jobPosting.employmentType.join(" ")
    : (jobPosting.employmentType ?? "");

  return {
    id: exactDedupKeyFromSource(JSONLD_GENERIC_CONNECTOR_ID, sourceOfferId),
    source: JSONLD_GENERIC_CONNECTOR_ID,
    sourceOfferId,
    canonicalUrl,
    applyUrl,
    title: jobPosting.title,
    company: {
      name: companyName,
      normalizedName: normalizeCompanyName(companyName),
    },
    location: {
      label: [postalCode, city].filter(Boolean).join(" ").trim(),
      city,
      postalCode,
      department: postalCode ? departmentFromPostalCode(postalCode) : undefined,
    },
    contractType: inferContractTypeFromText(`${jobPosting.title} ${descriptionText} ${employmentType}`),
    romeCodes: [],
    descriptionText,
    descriptionHtml: jobPosting.description,
    remotePolicy: "unknown",
    postedAt: jobPosting.datePosted,
    expiresAt: jobPosting.validThrough,
    firstSeenAt: now,
    lastSeenAt: now,
    lifecycle: "active",
    dedupKey: exactDedupKeyFromUrl(canonicalUrl),
    sourceRefs: [{ source: JSONLD_GENERIC_CONNECTOR_ID, sourceOfferId, canonicalUrl }],
    rawPayload: parsed,
  };
}
