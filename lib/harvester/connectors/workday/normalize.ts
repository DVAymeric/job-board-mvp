import { canonicalizeUrl } from "@/lib/harvester/canonicalize";
import { exactDedupKeyFromSource, exactDedupKeyFromUrl } from "@/lib/harvester/dedup-key";
import { normalizeCompanyName } from "@/lib/harvester/company-name";
import { stripHtml } from "@/lib/harvester/strip-html";
import { inferContractTypeFromText } from "@/lib/harvester/infer-contract-type";
import type { NormalizedOffer } from "@/lib/harvester/normalized-offer";
import type { RawOffer } from "@/lib/harvester/harvest-query";
import { WorkdayRawOfferSchema } from "@/lib/harvester/connectors/workday/types";
import { WORKDAY_CONNECTOR_ID } from "@/lib/harvester/connectors/workday/client";

export function normalizeWorkdayOffer(raw: RawOffer): NormalizedOffer {
  const parsed = WorkdayRawOfferSchema.parse(raw.payload);
  const { target, externalPath, jobPostingInfo } = parsed;

  const applyUrl =
    jobPostingInfo.externalUrl ?? `https://${target.tenant}.${target.dc}.myworkdayjobs.com/${target.site}${externalPath}`;
  const canonicalUrl = canonicalizeUrl(applyUrl);
  const now = new Date().toISOString();
  const sourceOfferId = jobPostingInfo.jobReqId ?? externalPath;
  const descriptionText = stripHtml(jobPostingInfo.jobDescription);
  const city = jobPostingInfo.location ?? "";

  return {
    id: exactDedupKeyFromSource(WORKDAY_CONNECTOR_ID, sourceOfferId),
    source: WORKDAY_CONNECTOR_ID,
    sourceOfferId,
    canonicalUrl,
    applyUrl,
    title: jobPostingInfo.title,
    company: {
      name: target.tenant,
      normalizedName: normalizeCompanyName(target.tenant),
    },
    location: {
      label: city,
      city,
    },
    contractType: inferContractTypeFromText(`${jobPostingInfo.title} ${descriptionText}`),
    romeCodes: [],
    descriptionText,
    remotePolicy: "unknown",
    firstSeenAt: now,
    lastSeenAt: now,
    lifecycle: "active",
    dedupKey: exactDedupKeyFromUrl(canonicalUrl),
    sourceRefs: [{ source: WORKDAY_CONNECTOR_ID, sourceOfferId, canonicalUrl }],
    rawPayload: parsed,
  };
}
