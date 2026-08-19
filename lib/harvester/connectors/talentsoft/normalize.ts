import { canonicalizeUrl } from "@/lib/harvester/canonicalize";
import { exactDedupKeyFromSource, exactDedupKeyFromUrl } from "@/lib/harvester/dedup-key";
import { normalizeCompanyName } from "@/lib/harvester/company-name";
import { stripHtml } from "@/lib/harvester/strip-html";
import { inferContractTypeFromText } from "@/lib/harvester/infer-contract-type";
import { departmentFromPostalCode } from "@/lib/harvester/department-from-postal-code";
import type { NormalizedOffer } from "@/lib/harvester/normalized-offer";
import type { RawOffer } from "@/lib/harvester/harvest-query";
import { TalentsoftRawOfferSchema } from "@/lib/harvester/connectors/talentsoft/types";
import { TALENTSOFT_CONNECTOR_ID } from "@/lib/harvester/connectors/talentsoft/client";

// Le handler RSS n'expose aucun champ de nom d'entreprise dédié — le domaine cible est le
// meilleur proxy disponible. Les domaines de carrière Talentsoft ressemblent conventionnellement
// à `recrutement.{entreprise}.fr` ou `{entreprise}.talent-soft.com` ; cette heuristique retire le
// label de tête habituel et le TLD, puis met en title-case ce qu'il reste. Ne récupère pas les
// vrais acronymes (ex. "mgen" -> "Mgen", pas "MGEN") — best-effort, pas autoritaire.
function companyNameFromDomain(domain: string): string {
  const labels = domain.split(".");
  const withoutTld = labels.length > 2 ? labels.slice(0, -1) : labels;
  const meaningful = withoutTld.filter((label) => !["recrutement", "emploi", "carrieres", "www"].includes(label));
  const core = meaningful[0] ?? withoutTld[0] ?? domain;
  return core
    .split("-")
    .map((word) => (word.length > 0 ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(" ");
}

// Les titres sont conventionnellement préfixés par une référence interne du type
// "2026-5515 - " — retirée pour un NormalizedOffer.title plus propre quand présente, titre brut
// conservé sinon.
function stripReferencePrefix(title: string): string {
  return title.replace(/^\d{4}-\d+\s*-\s*/, "").trim();
}

// JOB-31 (job-harvester) : vérifié en direct — la catégorie qui porte l'adresse ressemble à
// "59 bis boulevard Jean Jaurès, 74500 EVIAN-LES-BAINS, france" (virgule + code postal à 5
// chiffres) ; les autres catégories (filière/métier, type de contrat) n'ont jamais ce motif.
function findAddressCategory(categories: string[]): string | undefined {
  return categories.find((category) => /,\s*\d{5}/.test(category));
}

function parseAddress(address: string): { city: string; postalCode?: string } {
  const match = address.match(/(\d{5})\s+([^,]+)/);
  if (!match) return { city: address.trim() };
  const postalCode = match[1]!;
  const city = match[2]!.trim();
  return { city, postalCode };
}

export function normalizeTalentsoftOffer(raw: RawOffer): NormalizedOffer {
  const { domain, item } = TalentsoftRawOfferSchema.parse(raw.payload);
  const canonicalUrl = canonicalizeUrl(item.link);
  const now = new Date().toISOString();
  const companyName = companyNameFromDomain(domain);

  const idOffreMatch = item.link.match(/idOffre=(\d+)/);
  const sourceOfferId = idOffreMatch?.[1] ?? item.link;

  const addressCategory = findAddressCategory(item.categories);
  const { city, postalCode } = addressCategory ? parseAddress(addressCategory) : { city: "", postalCode: undefined };

  const title = stripReferencePrefix(item.title);
  const descriptionText = stripHtml(item.description);
  const contractTypeSourceText = `${item.categories.join(" ")} ${item.title}`;

  return {
    id: exactDedupKeyFromSource(TALENTSOFT_CONNECTOR_ID, sourceOfferId),
    source: TALENTSOFT_CONNECTOR_ID,
    sourceOfferId,
    canonicalUrl,
    applyUrl: item.link,
    title,
    company: {
      name: companyName,
      normalizedName: normalizeCompanyName(companyName),
    },
    location: {
      label: addressCategory ?? "",
      city,
      postalCode,
      department: postalCode ? departmentFromPostalCode(postalCode) : undefined,
    },
    contractType: inferContractTypeFromText(contractTypeSourceText),
    romeCodes: [],
    descriptionText,
    descriptionHtml: item.description,
    remotePolicy: "unknown",
    firstSeenAt: now,
    lastSeenAt: now,
    lifecycle: "active",
    dedupKey: exactDedupKeyFromUrl(canonicalUrl),
    sourceRefs: [{ source: TALENTSOFT_CONNECTOR_ID, sourceOfferId, canonicalUrl }],
    rawPayload: item,
  };
}
