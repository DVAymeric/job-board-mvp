import { canonicalizeUrl } from "@/lib/harvester/canonicalize";
import { exactDedupKeyFromSource, exactDedupKeyFromUrl } from "@/lib/harvester/dedup-key";
import { normalizeCompanyName } from "@/lib/harvester/company-name";
import { inferContractTypeFromText } from "@/lib/harvester/infer-contract-type";
import type { NormalizedOffer, RemotePolicy } from "@/lib/harvester/normalized-offer";
import type { RawOffer } from "@/lib/harvester/harvest-query";
import { WttjJobHitSchema } from "@/lib/harvester/connectors/welcometothejungle/types";
import { WTTJ_CONNECTOR_ID } from "@/lib/harvester/connectors/welcometothejungle/client";

// JOB-31 (job-harvester) : vérifié en direct — un job de recherche réel (`younited-credit` /
// `alternance-data-analyst-credit-risk-f-h_paris`) résout bien sur cette URL exacte
// (`/fr/companies/{organization.slug}/jobs/{job.slug}`).
function buildCanonicalUrl(organizationSlug: string, jobSlug: string): string {
  return `https://www.welcometothejungle.com/fr/companies/${organizationSlug}/jobs/${jobSlug}`;
}

// Valeurs observées en direct : "punctual" (télétravail occasionnel), "unknown" (non précisé).
// Les autres valeurs WTTJ ("full"/"no") ne sont pas confirmées en direct mais sont mappées par
// défaut d'après ce que suggère l'UI WTTJ elle-même.
function mapRemotePolicy(remote: string | null | undefined): RemotePolicy {
  switch (remote) {
    case "full":
    case "total":
      return "remote";
    case "punctual":
    case "occasional":
      return "hybrid";
    case "no":
      return "onsite";
    default:
      return "unknown";
  }
}

export function normalizeWttjOffer(raw: RawOffer): NormalizedOffer {
  const hit = WttjJobHitSchema.parse(raw.payload);
  const canonicalUrl = canonicalizeUrl(buildCanonicalUrl(hit.organization.slug, hit.slug));
  const now = new Date().toISOString();
  const geoloc = hit._geoloc?.[0];
  const contractTypeSourceText = `${hit.contract_type_names?.fr ?? ""} ${hit.name}`;
  const city = hit.office?.city ?? "";

  return {
    id: exactDedupKeyFromSource(WTTJ_CONNECTOR_ID, hit.objectID),
    source: WTTJ_CONNECTOR_ID,
    sourceOfferId: hit.objectID,
    canonicalUrl,
    applyUrl: canonicalUrl,
    title: hit.name,
    company: {
      name: hit.organization.name,
      normalizedName: normalizeCompanyName(hit.organization.name),
    },
    location: {
      label: city,
      city,
      lat: geoloc?.lat,
      lng: geoloc?.lng,
    },
    contractType: inferContractTypeFromText(contractTypeSourceText),
    durationMonths: hit.contract_duration_minimum ?? undefined,
    romeCodes: [],
    descriptionText: hit.profile ?? "",
    remotePolicy: mapRemotePolicy(hit.remote),
    postedAt: hit.published_at,
    firstSeenAt: now,
    lastSeenAt: now,
    lifecycle: "active",
    dedupKey: exactDedupKeyFromUrl(canonicalUrl),
    sourceRefs: [{ source: WTTJ_CONNECTOR_ID, sourceOfferId: hit.objectID, canonicalUrl }],
    rawPayload: hit,
  };
}
