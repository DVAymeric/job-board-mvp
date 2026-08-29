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
  onDeletedJob,
  focusedJobId,
}: {
  status: JobStatus;
  jobs: JobWithRelations[];
  onOpenJob: (id: string) => void;
  onDeletedJob?: (id: string) => void;
  focusedJobId?: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  const accent = STATUS_CONFIG[status];

  return (
    // Largeur ~90% + snap-start sous md (JOB-108) : chaque colonne occupe
    // presque tout l'écran mobile tout en laissant apparaître un aperçu de
    // la colonne suivante (le `gap-4` du conteneur parent). À partir de
    // `md:`, on repasse à une largeur égale (`flex-1`) comme sur desktop.
    <div className="flex w-[90%] min-w-0 shrink-0 snap-start flex-col md:w-auto md:flex-1 md:shrink md:snap-align-none">
      <div
        className={cn(
          "mb-2 flex items-baseline gap-2 border-b-2 px-1 pb-1.5",
          accent.accentBorderClassName
        )}
      >
        <h2 className="font-heading text-lg text-heading">
          {accent.label}
        </h2>
        <span className="rounded-full bg-pill-bg px-2 py-0.5 font-mono text-xs font-bold text-muted-foreground">
          {jobs.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        data-testid={`column-${status}`}
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
              onDeleted={onDeletedJob}
              focused={job.id === focusedJobId}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
