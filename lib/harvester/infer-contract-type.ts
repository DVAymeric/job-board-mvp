import type { ContractType } from "@/lib/harvester/normalized-offer";

export function inferContractTypeFromText(text: string): ContractType {
  if (/apprentissage/i.test(text)) return "apprentissage";
  if (/professionnalisation/i.test(text)) return "professionnalisation";
  if (/stage/i.test(text)) return "stage";
  // "alternance"/"alternant" (job-harvester JOB-33) est le terme générique français couvrant les
  // deux types de contrat ci-dessus sans préciser lequel. Défaut à apprentissage (le plus
  // courant des deux) plutôt que de perdre l'offre dans "autre", qu'un filtre UI en égalité
  // stricte exclurait entièrement. À revoir si une source distingue les deux plus précisément.
  if (/alternan(t|ce)/i.test(text)) return "apprentissage";
  return "autre";
}
