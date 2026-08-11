export const FOLLOW_UP_DAYS = 7;

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
    badgeClassName: string;
    accentBorderClassName: string;
    accentBorderLeftClassName: string;
  }
> = {
  TO_APPLY: {
    label: "À postuler",
    badgeClassName:
      "bg-[#eeedf5] text-[#54506a] dark:bg-[#332e42] dark:text-[#d3cbe0]",
    accentBorderClassName: "border-[#c8c6d7] dark:border-[#948aa6]",
    accentBorderLeftClassName: "border-l-[#c8c6d7] dark:border-l-[#948aa6]",
  },
  APPLIED: {
    label: "Postulé",
    badgeClassName:
      "bg-[#f1e6f3] text-[#6b3f74] dark:bg-[#3b2c42] dark:text-[#e4c7ea]",
    accentBorderClassName: "border-[#bfacc8] dark:border-[#b79bc4]",
    accentBorderLeftClassName: "border-l-[#bfacc8] dark:border-l-[#b79bc4]",
  },
  INTERVIEW: {
    label: "Entretien",
    badgeClassName:
      "bg-[#ebdcf0] text-[#5b2569] dark:bg-[#402a4b] dark:text-[#e3b4ef]",
    accentBorderClassName: "border-[#783f8e] dark:border-[#9a54b4]",
    accentBorderLeftClassName: "border-l-[#783f8e] dark:border-l-[#9a54b4]",
  },
  REJECTED: {
    label: "Refusé",
    badgeClassName:
      "bg-[#e6e2ea] text-[#4a4063] dark:bg-[#2c2734] dark:text-[#c7c0d4]",
    accentBorderClassName: "border-[#4a4063] dark:border-[#6b5c80]",
    accentBorderLeftClassName: "border-l-[#4a4063] dark:border-l-[#6b5c80]",
  },
};

export const FOLLOW_UP_BADGE_CLASSNAME =
  "bg-[#e3c9ec] text-[#4f1271] dark:bg-[#4a2b57] dark:text-[#ebc6f5]";

export function isJobStatus(value: string): value is JobStatus {
  return value in STATUS_CONFIG;
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
