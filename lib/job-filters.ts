import type { Job } from "@prisma/client";

export function matchesJobQuery(job: Job, query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return true;
  return (
    (job.title ?? "").toLowerCase().includes(trimmed) ||
    (job.companyName ?? "").toLowerCase().includes(trimmed) ||
    job.url.toLowerCase().includes(trimmed)
  );
}
