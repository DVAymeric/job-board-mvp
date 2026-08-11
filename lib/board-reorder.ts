import type { Job } from "@prisma/client";
import { isJobStatus, JobStatus } from "@/lib/constants";

export function computeReorderedColumn(
  jobs: Job[],
  activeId: string,
  overId: string
): { targetStatus: JobStatus; orderedIds: string[] } | null {
  const activeJob = jobs.find((j) => j.id === activeId);
  if (!activeJob) return null;

  const overIsColumn = isJobStatus(overId);
  const targetStatus = overIsColumn
    ? overId
    : jobs.find((j) => j.id === overId)?.status;
  if (!targetStatus || !isJobStatus(targetStatus)) return null;

  const siblings = jobs
    .filter((j) => j.status === targetStatus && j.id !== activeId)
    .sort((a, b) => a.order - b.order);

  let insertIndex = siblings.length;
  if (!overIsColumn) {
    const overIndex = siblings.findIndex((j) => j.id === overId);
    if (overIndex !== -1) insertIndex = overIndex;
  }

  const ordered = [
    ...siblings.slice(0, insertIndex),
    activeJob,
    ...siblings.slice(insertIndex),
  ];

  return { targetStatus, orderedIds: ordered.map((j) => j.id) };
}
