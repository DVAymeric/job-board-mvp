import type { Job } from "@prisma/client";
import type { JobWithRelations } from "@/lib/types";

export function matchesJobQuery(job: Job, query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return true;
  return (
    (job.title ?? "").toLowerCase().includes(trimmed) ||
    (job.companyName ?? "").toLowerCase().includes(trimmed) ||
    job.url.toLowerCase().includes(trimmed)
  );
}

export function matchesSelectedTags(
  job: Pick<JobWithRelations, "tags">,
  selectedTagIds: string[]
): boolean {
  if (selectedTagIds.length === 0) return true;
  const jobTagIds = new Set(job.tags.map((jt) => jt.tagId));
  return selectedTagIds.some((tagId) => jobTagIds.has(tagId));
}
