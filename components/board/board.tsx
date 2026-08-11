"use client";

import { useMemo, useState } from "react";
import type { Job } from "@prisma/client";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Column } from "@/components/board/column";
import { JobSheet } from "@/components/board/job-sheet";
import { needsFollowUp } from "@/components/board/job-card";
import { STATUS_ORDER, isJobStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { updateJobStatus } from "@/app/actions";
import { toast } from "sonner";

export function Board({ initialJobs }: { initialJobs: Job[] }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [followUpOnly, setFollowUpOnly] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const visibleJobs = useMemo(
    () => (followUpOnly ? jobs.filter(needsFollowUp) : jobs),
    [jobs, followUpOnly]
  );

  const selectedJob = jobs.find((j) => j.id === selectedJobId) ?? null;

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const newStatus = over.id.toString();
    if (!isJobStatus(newStatus)) return;

    const job = jobs.find((j) => j.id === active.id);
    if (!job || job.status === newStatus) return;

    const previousJobs = jobs;
    setJobs((prev) =>
      prev.map((j) =>
        j.id === job.id
          ? {
              ...j,
              status: newStatus,
              lastFollowUp:
                newStatus === "APPLIED" ? new Date() : j.lastFollowUp,
            }
          : j
      )
    );

    const result = await updateJobStatus(job.id, newStatus);
    if (!result.ok) {
      setJobs(previousJobs);
      toast.error(result.error);
    }
  }

  function handleUpdated(updated: Job) {
    setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
  }

  function handleDeleted(id: string) {
    setJobs((prev) => prev.filter((j) => j.id !== id));
    setSelectedJobId(null);
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl text-heading">Board</h1>
        <Button
          variant={followUpOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setFollowUpOnly((v) => !v)}
          className={cn(followUpOnly && "ring-2 ring-ring/50")}
        >
          Candidatures à relancer
        </Button>
      </div>

      <DndContext
        id="job-board-dnd"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 gap-4 overflow-x-auto">
          {STATUS_ORDER.map((status) => (
            <Column
              key={status}
              status={status}
              jobs={visibleJobs.filter((j) => j.status === status)}
              onOpenJob={setSelectedJobId}
            />
          ))}
        </div>
      </DndContext>

      <JobSheet
        key={selectedJob?.id ?? "none"}
        job={selectedJob}
        onOpenChange={(open) => {
          if (!open) setSelectedJobId(null);
        }}
        onUpdated={handleUpdated}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
