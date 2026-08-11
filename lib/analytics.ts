import { JobStatus, STATUS_CONFIG, STATUS_ORDER } from "@/lib/constants";

export type FunnelStage = {
  status: JobStatus;
  label: string;
  count: number;
  conversionFromPrevious: number | null;
};

export function computeStatusFunnel(
  jobs: { statusHistory: { status: string }[] }[]
): FunnelStage[] {
  const counts = new Map<JobStatus, number>(STATUS_ORDER.map((s) => [s, 0]));

  for (const job of jobs) {
    const reached = new Set(job.statusHistory.map((h) => h.status));
    for (const status of STATUS_ORDER) {
      if (reached.has(status)) {
        counts.set(status, (counts.get(status) ?? 0) + 1);
      }
    }
  }

  return STATUS_ORDER.map((status, index) => {
    const count = counts.get(status) ?? 0;
    const previousCount = index === 0 ? null : counts.get(STATUS_ORDER[index - 1]) ?? 0;
    const conversionFromPrevious =
      previousCount === null || previousCount === 0
        ? null
        : Math.round((count / previousCount) * 1000) / 10;

    return {
      status,
      label: STATUS_CONFIG[status].label,
      count,
      conversionFromPrevious,
    };
  });
}
