import type { Job } from "@prisma/client";

export const FOLLOW_UP_DAYS = 7;

/**
 * Garde-fou sur la requête findMany non bornée du board (JOB-86). Pas de
 * vraie pagination : /board est un Kanban drag-and-drop (paginer casserait
 * le glisser-déposer entre colonnes). Ce seuil protège seulement contre une
 * croissance pathologique (import massif, bug) : un usage personnel normal
 * ne l'approche jamais. /analytics reste volontairement non borné ici —
 * traité séparément en passant ses agrégations côté DB (JOB-92).
 */
export const BOARD_JOBS_SAFETY_LIMIT = 500;

export const STATUS = {
  TO_APPLY: "TO_APPLY",
  APPLIED: "APPLIED",
  INTERVIEW: "INTERVIEW",
  REJECTED: "REJECTED",
} as const;

export type JobStatus = (typeof STATUS)[keyof typeof STATUS];

export const STATUS_ORDER: JobStatus[] = [
  STATUS.TO_APPLY,
  STATUS.APPLIED,
  STATUS.INTERVIEW,
  STATUS.REJECTED,
];

export const STATUS_CONFIG: Record<
  JobStatus,
  {
    label: string;
    textClassName: string;
    accentBorderClassName: string;
    accentBorderLeftClassName: string;
  }
> = {
  // Une couleur nettement distincte par statut (gris / bleu / violet / rouge)
  // plutôt que des variations d'un même lilas pâle — scannable au premier
  // coup d'œil sur le board. Chaque hex clair est vérifié ≥ 4.5:1 (AA texte
  // normal) sur fond blanc, sa variante dark: ≥ 4.5:1 sur la carte sombre
  // (#271f33) : le label passe en texte gras coloré sans pastille de fond
  // (JOB-101), le contraste doit donc porter sur le texte lui-même.
  TO_APPLY: {
    label: "À postuler",
    textClassName: "text-[#6b6680] dark:text-[#a89fc0]",
    accentBorderClassName: "border-[#6b6680] dark:border-[#a89fc0]",
    accentBorderLeftClassName: "border-l-[#6b6680] dark:border-l-[#a89fc0]",
  },
  APPLIED: {
    label: "Postulé",
    textClassName: "text-[#3d6fb4] dark:text-[#6f9ad1]",
    accentBorderClassName: "border-[#3d6fb4] dark:border-[#6f9ad1]",
    accentBorderLeftClassName: "border-l-[#3d6fb4] dark:border-l-[#6f9ad1]",
  },
  INTERVIEW: {
    label: "Entretien",
    textClassName: "text-[#783f8e] dark:text-[#e3b4ef]",
    accentBorderClassName: "border-[#783f8e] dark:border-[#9a54b4]",
    accentBorderLeftClassName: "border-l-[#783f8e] dark:border-l-[#9a54b4]",
  },
  REJECTED: {
    label: "Refusé",
    textClassName: "text-[#c14747] dark:text-[#d98080]",
    accentBorderClassName: "border-[#c14747] dark:border-[#d98080]",
    accentBorderLeftClassName: "border-l-[#c14747] dark:border-l-[#d98080]",
  },
};

export const FOLLOW_UP_BADGE_CLASSNAME =
  "bg-[#e3c9ec] text-[#4f1271] dark:bg-[#4a2b57] dark:text-[#ebc6f5]";

export function isJobStatus(value: string): value is JobStatus {
  return value in STATUS_CONFIG;
}

// Type de contrat de la candidature suivie (JOB-124) — distinct de
// OfferContractType (Harvester, alternance/stage uniquement) : le Job
// personnel peut concerner n'importe quel type d'emploi. Valeurs alignées
// sur l'enum Prisma JobContractType (prisma/schema.prisma).
export const JOB_CONTRACT_TYPE = {
  CDI: "CDI",
  CDD: "CDD",
  ALTERNANCE: "ALTERNANCE",
  STAGE: "STAGE",
  FREELANCE: "FREELANCE",
  INTERIM: "INTERIM",
  AUTRE: "AUTRE",
} as const;

export type JobContractType =
  (typeof JOB_CONTRACT_TYPE)[keyof typeof JOB_CONTRACT_TYPE];

export const JOB_CONTRACT_TYPE_ORDER: JobContractType[] = [
  JOB_CONTRACT_TYPE.CDI,
  JOB_CONTRACT_TYPE.CDD,
  JOB_CONTRACT_TYPE.ALTERNANCE,
  JOB_CONTRACT_TYPE.STAGE,
  JOB_CONTRACT_TYPE.FREELANCE,
  JOB_CONTRACT_TYPE.INTERIM,
  JOB_CONTRACT_TYPE.AUTRE,
];

export const JOB_CONTRACT_TYPE_LABELS: Record<JobContractType, string> = {
  CDI: "CDI",
  CDD: "CDD",
  ALTERNANCE: "Alternance",
  STAGE: "Stage",
  FREELANCE: "Freelance",
  INTERIM: "Intérim",
  AUTRE: "Autre",
};

export function isJobContractType(value: string): value is JobContractType {
  return value in JOB_CONTRACT_TYPE_LABELS;
}

export function needsFollowUp(
  job: Pick<Job, "status" | "lastFollowUp" | "createdAt">
): boolean {
  if (job.status !== STATUS.APPLIED) return false;
  const reference = job.lastFollowUp ?? job.createdAt;
  const days =
    (Date.now() - new Date(reference).getTime()) / (1000 * 60 * 60 * 24);
  return days >= FOLLOW_UP_DAYS;
}

export const CONTACT_ROLE = {
  RECRUITER: "RECRUITER",
  MANAGER: "MANAGER",
  REFERRAL: "REFERRAL",
  OTHER: "OTHER",
} as const;

export type ContactRole = (typeof CONTACT_ROLE)[keyof typeof CONTACT_ROLE];

export const CONTACT_ROLE_ORDER: ContactRole[] = [
  CONTACT_ROLE.RECRUITER,
  CONTACT_ROLE.MANAGER,
  CONTACT_ROLE.REFERRAL,
  CONTACT_ROLE.OTHER,
];

export const CONTACT_ROLE_LABELS: Record<ContactRole, string> = {
  RECRUITER: "Recruteur",
  MANAGER: "Manager",
  REFERRAL: "Referral",
  OTHER: "Autre",
};

export function isContactRole(value: string): value is ContactRole {
  return value in CONTACT_ROLE_LABELS;
}

export const SALARY_TYPE = {
  ANNUAL: "ANNUAL",
  DAILY_RATE: "DAILY_RATE",
} as const;

export type SalaryType = (typeof SALARY_TYPE)[keyof typeof SALARY_TYPE];

export const SALARY_TYPE_ORDER: SalaryType[] = [
  SALARY_TYPE.ANNUAL,
  SALARY_TYPE.DAILY_RATE,
];

export const SALARY_TYPE_LABELS: Record<SalaryType, string> = {
  ANNUAL: "Salaire annuel (€)",
  DAILY_RATE: "TJM (€/jour)",
};

export function isSalaryType(value: string): value is SalaryType {
  return value in SALARY_TYPE_LABELS;
}

// Average French working days per year, used to bring TJM (daily rate) and
// annual salary onto a comparable scale in the comparator view.
export const WORKING_DAYS_PER_YEAR = 218;
