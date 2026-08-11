"use client";

import { useDroppable } from "@dnd-kit/core";
import type { Job } from "@prisma/client";
import { JobCard } from "@/components/board/job-card";
import { JobStatus, STATUS_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function Column({
  status,
  jobs,
  onOpenJob,
}: {
  status: JobStatus;
  jobs: Job[];
  onOpenJob: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <h2 className="text-sm font-semibold">{STATUS_CONFIG[status].label}</h2>
        <span className="text-xs text-muted-foreground">{jobs.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-1 flex-col gap-2 rounded-lg border border-dashed border-border p-2 transition-colors",
          isOver && "border-primary bg-muted/50"
        )}
      >
        {jobs.length === 0 && (
          <p className="p-2 text-center text-xs text-muted-foreground">
            Aucune candidature ici
          </p>
        )}
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} onOpen={onOpenJob} />
        ))}
      </div>
    </div>
  );
}
