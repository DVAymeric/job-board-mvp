import { canonicalizeUrl } from "@/lib/harvester/canonicalize";
import { exactDedupKeyFromSource, exactDedupKeyFromUrl } from "@/lib/harvester/dedup-key";
import { normalizeCompanyName } from "@/lib/harvester/company-name";
import { inferContractTypeFromText } from "@/lib/harvester/infer-contract-type";
import { departmentFromPostalCode } from "@/lib/harvester/department-from-postal-code";
import type { NormalizedOffer } from "@/lib/harvester/normalized-offer";
import type { RawOffer } from "@/lib/harvester/harvest-query";
import { DigitalRecruitersRawOfferSchema } from "@/lib/harvester/connectors/digitalrecruiters/types";
import { DIGITALRECRUITERS_CONNECTOR_ID } from "@/lib/harvester/connectors/digitalrecruiters/client";

// La liste des job-ads n'expose aucun champ de nom d'entreprise dédié (seulement des divisions
// internes DR — "brand" — ex. "DECATHLON Retail Omnichannel", pas l'entreprise elle-même) — le
// sous-domaine cible (`joinus.{entreprise}.fr`) est le meilleur proxy disponible. Best-effort,
// pas autoritaire : ne récupère pas les noms de marque en casse mixte au-delà d'un simple
// title-case.
function companyNameFromDomain(domain: string): string {
  const labels = domain.split(".");
  const withoutTld = labels.length > 2 ? labels.slice(0, -1) : labels;
  const meaningful = withoutTld.filter((label) => label !== "joinus" && label !== "www");
  const core = meaningful[0] ?? withoutTld[0] ?? domain;
  return core
    .split("-")
    .map((word) => (word.length > 0 ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(" ");
}

// JOB-31 (job-harvester) : vérifié en direct — le slug `url` se termine systématiquement par
// "-{code postal 5 chiffres}-{ville}" (ex. "...-33300-bordeaux"), ce qui permet d'en extraire
// une localisation sans requête supplémentaire.
function parseLocationFromSlug(url: string): { postalCode?: string; citySlug?: string } {
  const match = url.match(/-(\d{5})-([a-z0-9-]+)$/i);
  if (!match) return {};
  return { postalCode: match[1], citySlug: match[2] };
}

export function normalizeDigitalRecruitersOffer(raw: RawOffer): NormalizedOffer {
  const { domain, item } = DigitalRecruitersRawOfferSchema.parse(raw.payload);
  const canonicalUrl = canonicalizeUrl(`https://${domain}/fr/annonce/${item.url}`);
  const now = new Date().toISOString();
  const companyName = companyNameFromDomain(domain);
  const sourceOfferId = String(item.job_ad_id);

  const { postalCode } = parseLocationFromSlug(item.url);
  const city = item.location ?? "";
  const contractTypeSourceText = `${item.contract ?? ""} ${item.title} ${item.job ?? ""}`;

  return {
    id: exactDedupKeyFromSource(DIGITALRECRUITERS_CONNECTOR_ID, sourceOfferId),
    source: DIGITALRECRUITERS_CONNECTOR_ID,
    sourceOfferId,
    canonicalUrl,
    applyUrl: canonicalUrl,
    title: item.title,
    company: {
      name: companyName,
      normalizedName: normalizeCompanyName(companyName),
    },
    location: {
      label: city,
      city,
      postalCode,
      department: postalCode ? departmentFromPostalCode(postalCode) : undefined,
    },
    contractType: inferContractTypeFromText(contractTypeSourceText),
    romeCodes: [],
    // La liste des job-ads ne renvoie aucun champ de description (vérifié en direct) — l'obtenir
    // demanderait une requête de détail par offre, hors budget de ce connecteur. Laissé vide
    // plutôt que fabriqué ; canonicalUrl reste un lien valide vers l'offre complète.
    descriptionText: "",
    remotePolicy: "unknown",
    firstSeenAt: now,
    lastSeenAt: now,
    lifecycle: "active",
    dedupKey: exactDedupKeyFromUrl(canonicalUrl),
    sourceRefs: [{ source: DIGITALRECRUITERS_CONNECTOR_ID, sourceOfferId, canonicalUrl }],
    rawPayload: item,
  };
}
