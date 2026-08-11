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
  { label: string; badgeClassName: string }
> = {
  TO_APPLY: {
    label: "À postuler",
    badgeClassName:
      "bg-[#e4edf8] text-[#344966] dark:bg-[#1c2b3a] dark:text-[#b4cded]",
  },
  APPLIED: {
    label: "Postulé",
    badgeClassName:
      "bg-[#dbe3ec] text-[#24384f] dark:bg-[#26384a] dark:text-[#dbe8f7]",
  },
  INTERVIEW: {
    label: "Entretien",
    badgeClassName:
      "bg-[#eef2e0] text-[#5c6b3a] dark:bg-[#333d24] dark:text-[#d3dcb5]",
  },
  REJECTED: {
    label: "Refusé",
    badgeClassName:
      "bg-[#e8e6e2] text-[#5a5650] dark:bg-[#2c2b28] dark:text-[#c9c5be]",
  },
};

export const FOLLOW_UP_BADGE_CLASSNAME =
  "bg-[#f3e2df] text-[#b3554a] dark:bg-[#3a2823] dark:text-[#e8a99b]";

export function isJobStatus(value: string): value is JobStatus {
  return value in STATUS_CONFIG;
}
