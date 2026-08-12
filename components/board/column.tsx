"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { JobCard } from "@/components/board/job-card";
import { JobStatus, STATUS_CONFIG } from "@/lib/constants";
import type { JobWithRelations } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Column({
  status,
  jobs,
  onOpenJob,
  focusedJobId,
}: {
  status: JobStatus;
  jobs: JobWithRelations[];
  onOpenJob: (id: string) => void;
  focusedJobId?: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  const accent = STATUS_CONFIG[status];

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div
        className={cn(
          "mb-2 flex items-baseline gap-2 border-b-2 px-1 pb-1.5",
          accent.accentBorderClassName
        )}
      >
        <h2 className="font-heading text-base text-heading">
          {accent.label}
        </h2>
        <span className="font-mono text-xs text-muted-foreground">
          {jobs.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-1 flex-col gap-2 rounded-lg border border-dashed border-border p-2 transition-colors",
          isOver && cn(accent.accentBorderClassName, "bg-muted/50")
        )}
      >
        {jobs.length === 0 && (
          <p className="p-2 text-center text-xs text-muted-foreground">
            Aucune candidature ici
          </p>
        )}
        <SortableContext
          items={jobs.map((job) => job.id)}
          strategy={verticalListSortingStrategy}
        >
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onOpen={onOpenJob}
              focused={job.id === focusedJobId}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
