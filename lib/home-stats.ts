import type { Job } from "@prisma/client";
import { JobStatus, STATUS_ORDER, needsFollowUp } from "@/lib/constants";

export function computeStatusCounts(
  jobs: Pick<Job, "status">[]
): Record<JobStatus, number> {
  const counts = Object.fromEntries(
    STATUS_ORDER.map((status) => [status, 0])
  ) as Record<JobStatus, number>;
  for (const job of jobs) {
    if (job.status in counts) {
      counts[job.status as JobStatus] += 1;
    }
  }
  return counts;
}

export function computeFollowUpSummary(
  jobs: Pick<Job, "status" | "lastFollowUp" | "createdAt">[],
  today: Date = new Date()
): { count: number; oldestDays: number | null } {
  const pending = jobs.filter((job) => needsFollowUp(job));
  if (pending.length === 0) {
    return { count: 0, oldestDays: null };
  }
  const oldestDays = Math.max(
    ...pending.map((job) => {
      const reference = job.lastFollowUp ?? job.createdAt;
      return Math.floor(
        (today.getTime() - new Date(reference).getTime()) /
          (1000 * 60 * 60 * 24)
      );
    })
  );
  return { count: pending.length, oldestDays };
}
