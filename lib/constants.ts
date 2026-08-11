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
    badgeClassName: "bg-muted text-muted-foreground",
  },
  APPLIED: {
    label: "Postulé",
    badgeClassName:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  INTERVIEW: {
    label: "Entretien",
    badgeClassName:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  },
  REJECTED: {
    label: "Refusé",
    badgeClassName:
      "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  },
};

export function isJobStatus(value: string): value is JobStatus {
  return value in STATUS_CONFIG;
}
