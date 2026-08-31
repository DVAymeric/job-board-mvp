// Connecteurs internes (lib/harvester/connectors/index.ts, champ `id`) → libellés
// lisibles pour l'utilisateur — même principe que CAMPAIGN_CONTRACT_TYPE_LABELS
// (campaign-validation.ts) et REMOTE_POLICY_LABELS (lib/search/offers.ts) :
// jamais le code brut du connecteur affiché tel quel à l'utilisateur (JOB-150).
export const SOURCE_LABELS: Record<string, string> = {
  francetravail: "France Travail",
  labonnealternance: "La Bonne Alternance",
  workday: "Workday",
  smartrecruiters: "SmartRecruiters",
  talentsoft: "Talentsoft",
  digitalrecruiters: "DigitalRecruiters",
  welcometothejungle: "Welcome to the Jungle",
};

export function getSourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}
