import { canonicalizeUrl } from "@/lib/harvester/canonicalize";
import { exactDedupKeyFromSource, exactDedupKeyFromUrl } from "@/lib/harvester/dedup-key";
import { normalizeCompanyName } from "@/lib/harvester/company-name";
import { stripHtml } from "@/lib/harvester/strip-html";
import { inferContractTypeFromText } from "@/lib/harvester/infer-contract-type";
import { departmentFromPostalCode } from "@/lib/harvester/department-from-postal-code";
import type { NormalizedOffer } from "@/lib/harvester/normalized-offer";
import type { RawOffer } from "@/lib/harvester/harvest-query";
import { SmartRecruitersRawOfferSchema } from "@/lib/harvester/connectors/smartrecruiters/types";
import { SMARTRECRUITERS_CONNECTOR_ID } from "@/lib/harvester/connectors/smartrecruiters/client";

export function normalizeSmartRecruitersOffer(raw: RawOffer): NormalizedOffer {
  const { company, detail: parsed } = SmartRecruitersRawOfferSchema.parse(raw.payload);
  const applyUrl = parsed.applyUrl ?? parsed.postingUrl ?? `https://api.smartrecruiters.com/v1/companies/${company}/postings/${parsed.id}`;
  const canonicalUrl = canonicalizeUrl(applyUrl);
  const now = new Date().toISOString();
  const companyName = parsed.company?.name ?? "Entreprise inconnue";
  const descriptionText = stripHtml(parsed.jobAd?.sections?.jobDescription?.text ?? "");
  const postalCode = parsed.location?.postalCode;
  const sourceOfferId = parsed.id;

  return {
    id: exactDedupKeyFromSource(SMARTRECRUITERS_CONNECTOR_ID, sourceOfferId),
    source: SMARTRECRUITERS_CONNECTOR_ID,
    sourceOfferId,
    canonicalUrl,
    applyUrl,
    title: parsed.name,
    company: {
      name: companyName,
      normalizedName: normalizeCompanyName(companyName),
    },
    location: {
      label: parsed.location?.city ?? "",
      city: parsed.location?.city ?? "",
      postalCode,
      department: postalCode ? departmentFromPostalCode(postalCode) : undefined,
    },
    contractType: inferContractTypeFromText(`${parsed.name} ${descriptionText}`),
    romeCodes: [],
    descriptionText,
    remotePolicy: "unknown",
    postedAt: parsed.releasedDate,
    firstSeenAt: now,
    lastSeenAt: now,
    lifecycle: "active",
    dedupKey: exactDedupKeyFromUrl(canonicalUrl),
    sourceRefs: [{ source: SMARTRECRUITERS_CONNECTOR_ID, sourceOfferId, canonicalUrl }],
    rawPayload: parsed,
  };
}
