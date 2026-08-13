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

export type MostActiveMonth = {
  label: string;
  count: number;
};

export function computeMostActiveMonth(
  jobs: { createdAt: Date }[],
  today: Date = new Date()
): MostActiveMonth | null {
  const windowStart = new Date(today.getFullYear(), today.getMonth() - 11, 1);

  const counts = new Map<string, number>();
  for (const job of jobs) {
    const createdAt = new Date(job.createdAt);
    if (createdAt < windowStart || createdAt > today) continue;
    const key = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  let bestKey: string | null = null;
  let bestCount = -1;
  for (const [key, count] of counts) {
    if (count > bestCount || (count === bestCount && key > (bestKey ?? ""))) {
      bestKey = key;
      bestCount = count;
    }
  }
  if (bestKey === null) return null;

  const [year, month] = bestKey.split("-").map(Number);
  const monthName = new Date(year, month - 1, 1).toLocaleDateString("fr-FR", {
    month: "long",
  });

  return {
    label: monthName.charAt(0).toUpperCase() + monthName.slice(1),
    count: bestCount,
  };
}
