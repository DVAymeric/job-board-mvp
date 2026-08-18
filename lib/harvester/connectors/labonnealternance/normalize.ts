import { canonicalizeUrl } from "@/lib/harvester/canonicalize";
import { exactDedupKeyFromSource, exactDedupKeyFromUrl } from "@/lib/harvester/dedup-key";
import { normalizeCompanyName } from "@/lib/harvester/company-name";
import type { ContractType, NormalizedOffer } from "@/lib/harvester/normalized-offer";
import type { RawOffer } from "@/lib/harvester/harvest-query";
import { LbaOfferSchema } from "@/lib/harvester/connectors/labonnealternance/types";
import { LBA_CONNECTOR_ID } from "@/lib/harvester/connectors/labonnealternance/client";

const SELF_PARTNER_LABELS = new Set(["offres_emploi_lba", "recruteurs_lba"]);

function mapContractType(types: string[]): ContractType {
  if (types.includes("Apprentissage")) return "apprentissage";
  if (types.includes("Professionnalisation")) return "professionnalisation";
  return "autre";
}

function mapOriginSource(partnerLabel: string): string | undefined {
  return SELF_PARTNER_LABELS.has(partnerLabel) ? undefined : partnerLabel;
}

// LBA n'expose qu'une adresse en texte libre ; code postal et ville sont extraits de sa
// convention finale "<code postal> <ville>", avec repli sur la chaîne brute sinon.
function parseFrenchAddress(address: string): { city: string; postalCode?: string; department?: string } {
  const match = address.trim().match(/(\d{5})\s+(.+)$/);
  if (!match) return { city: address.trim() };
  // Les deux groupes sont obligatoires (non optionnels) dans le pattern ci-dessus, donc un match
  // réussi garantit qu'ils sont peuplés ; noUncheckedIndexedAccess ne peut pas le voir.
  const postalCode = match[1]!;
  const city = match[2]!;
  return { city: city.trim(), postalCode, department: postalCode.slice(0, 2) };
}

export function normalizeLbaOffer(raw: RawOffer): NormalizedOffer {
  const parsed = LbaOfferSchema.parse(raw.payload);
  const canonicalUrl = canonicalizeUrl(parsed.apply.url);
  const now = new Date().toISOString();
  const companyName = parsed.workplace.name ?? parsed.workplace.legal_name ?? "Entreprise inconnue";
  const { city, postalCode, department } = parseFrenchAddress(parsed.workplace.location.address);
  const sourceOfferId = parsed.identifier.partner_job_id;

  return {
    id: exactDedupKeyFromSource(LBA_CONNECTOR_ID, sourceOfferId),
    source: LBA_CONNECTOR_ID,
    sourceOfferId,
    originSource: mapOriginSource(parsed.identifier.partner_label),
    canonicalUrl,
    applyUrl: parsed.apply.url,
    title: parsed.offer.title,
    company: {
      name: companyName,
      normalizedName: normalizeCompanyName(companyName),
      siret: parsed.workplace.siret ?? undefined,
      website: parsed.workplace.website ?? undefined,
    },
    location: {
      label: parsed.workplace.location.address,
      city,
      postalCode,
      department,
      lat: parsed.workplace.location.geopoint.coordinates[1],
      lng: parsed.workplace.location.geopoint.coordinates[0],
    },
    contractType: mapContractType(parsed.contract.type),
    durationMonths: parsed.contract.duration ?? undefined,
    startDate: parsed.contract.start ?? undefined,
    romeCodes: parsed.offer.rome_codes,
    descriptionText: parsed.offer.description,
    remotePolicy: parsed.contract.remote ?? "unknown",
    postedAt: parsed.offer.publication.creation ?? undefined,
    expiresAt: parsed.offer.publication.expiration ?? undefined,
    firstSeenAt: now,
    lastSeenAt: now,
    lifecycle: "active",
    dedupKey: exactDedupKeyFromUrl(canonicalUrl),
    sourceRefs: [{ source: LBA_CONNECTOR_ID, sourceOfferId, canonicalUrl }],
    rawPayload: parsed,
  };
}
