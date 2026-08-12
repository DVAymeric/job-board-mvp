"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Column } from "@/components/board/column";
import { JobDialog } from "@/components/board/job-dialog";
import { InterviewReminderWatcher } from "@/components/board/interview-reminder-watcher";
import { needsFollowUp } from "@/components/board/job-card";
import { STATUS, STATUS_ORDER } from "@/lib/constants";
import { computeReorderedColumn } from "@/lib/board-reorder";
import { adjacentStatus, computeNextFocusedJob } from "@/lib/board-keyboard";
import { matchesJobQuery, matchesSelectedTags } from "@/lib/job-filters";
import type { JobWithRelations } from "@/lib/types";
import { cn } from "@/lib/utils";
import { reorderJobs, updateJobStatus } from "@/app/actions";
import { toast } from "sonner";

const SEARCH_DEBOUNCE_MS = 200;

export function Board({ initialJobs }: { initialJobs: JobWithRelations[] }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [followUpOnly, setFollowUpOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [focusedJobId, setFocusedJobId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    const timeout = setTimeout(
      () => setDebouncedSearch(search),
      SEARCH_DEBOUNCE_MS
    );
    return () => clearTimeout(timeout);
  }, [search]);

  const allTags = useMemo(() => {
    const byId = new Map<string, string>();
    for (const job of jobs) {
      for (const jt of job.tags) byId.set(jt.tagId, jt.tag.name);
    }
    return Array.from(byId, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [jobs]);

  const visibleJobs = useMemo(
    () =>
      jobs
        .filter((j) => (followUpOnly ? needsFollowUp(j) : true))
        .filter((j) => matchesJobQuery(j, debouncedSearch))
        .filter((j) => matchesSelectedTags(j, selectedTagIds)),
    [jobs, followUpOnly, debouncedSearch, selectedTagIds]
  );

  const selectedJob = jobs.find((j) => j.id === selectedJobId) ?? null;

  const focusColumns = useMemo(
    () =>
      STATUS_ORDER.map((status) => ({
        status,
        jobIds: visibleJobs
          .filter((j) => j.status === status)
          .sort((a, b) => a.order - b.order)
          .map((j) => j.id),
      })),
    [visibleJobs]
  );

  const moveJob = useCallback(async (activeId: string, overId: string) => {
    if (activeId === overId) return;

    const activeJob = jobs.find((j) => j.id === activeId);
    if (!activeJob) return;

    const reordered = computeReorderedColumn(jobs, activeId, overId);
    if (!reordered) return;
    const { targetStatus, orderedIds } = reordered;
    const statusChanged = activeJob.status !== targetStatus;

    const previousJobs = jobs;
    const orderById = new Map(orderedIds.map((id, index) => [id, index]));
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id === activeId) {
          return {
            ...j,
            status: targetStatus,
            order: orderById.get(j.id) ?? j.order,
            lastFollowUp:
              statusChanged && targetStatus === STATUS.APPLIED
                ? new Date()
                : j.lastFollowUp,
            statusHistory: statusChanged
              ? [
                  ...j.statusHistory,
                  {
                    id: crypto.randomUUID(),
                    jobId: j.id,
                    status: targetStatus,
                    changedAt: new Date(),
                  },
                ]
              : j.statusHistory,
          };
        }
        const order = orderById.get(j.id);
        return order === undefined ? j : { ...j, order };
      })
    );

    if (statusChanged) {
      const statusResult = await updateJobStatus(activeId, targetStatus);
      if (!statusResult.ok) {
        setJobs(previousJobs);
        toast.error(statusResult.error);
        return;
      }
    }

    const reorderResult = await reorderJobs(orderedIds);
    if (!reorderResult.ok) {
      setJobs(previousJobs);
      toast.error(reorderResult.error);
    }
  }, [jobs]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    await moveJob(active.id.toString(), over.id.toString());
  }

  function handleUpdated(updated: JobWithRelations) {
    setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
  }

  function handleDeleted(id: string) {
    setJobs((prev) => prev.filter((j) => j.id !== id));
    setSelectedJobId(null);
  }

  useEffect(() => {
    const directionByKey: Record<string, "up" | "down" | "left" | "right"> = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
    };

    function handleKeyDown(event: KeyboardEvent) {
      if (selectedJobId) return;
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }

      const direction = directionByKey[event.key];
      if (direction && !event.shiftKey) {
        event.preventDefault();
        setFocusedJobId((current) =>
          computeNextFocusedJob(focusColumns, current, direction)
        );
        return;
      }

      if (event.shiftKey && (event.key === "ArrowRight" || event.key === "ArrowLeft")) {
        if (!focusedJobId) return;
        const job = jobs.find((j) => j.id === focusedJobId);
        if (!job) return;
        const targetStatus = adjacentStatus(
          STATUS_ORDER,
          job.status,
          event.key === "ArrowRight" ? "next" : "prev"
        );
        if (!targetStatus) return;
        event.preventDefault();
        moveJob(focusedJobId, targetStatus);
        return;
      }

      if (event.key === "Enter" && focusedJobId) {
        event.preventDefault();
        setSelectedJobId(focusedJobId);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusColumns, focusedJobId, jobs, selectedJobId, moveJob]);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <InterviewReminderWatcher jobs={jobs} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-heading text-xl text-heading">Board</h1>
        <div className="flex flex-1 items-center justify-end gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un titre, une entreprise, une URL..."
            className="h-8 max-w-xs"
          />
          <Button
            variant={followUpOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setFollowUpOnly((v) => !v)}
            className={cn(followUpOnly && "ring-2 ring-ring/50")}
          >
            Candidatures à relancer
          </Button>
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {allTags.map((tag) => {
            const selected = selectedTagIds.includes(tag.id);
            return (
              <Button
                key={tag.id}
                type="button"
                variant={selected ? "default" : "outline"}
                size="xs"
                onClick={() =>
                  setSelectedTagIds((prev) =>
                    selected
                      ? prev.filter((id) => id !== tag.id)
                      : [...prev, tag.id]
                  )
                }
              >
                {tag.name}
              </Button>
            );
          })}
        </div>
      )}

      {(debouncedSearch.trim() || selectedTagIds.length > 0) &&
      visibleJobs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Aucune candidature ne correspond
        </p>
      ) : (
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
                jobs={visibleJobs
                  .filter((j) => j.status === status)
                  .sort((a, b) => a.order - b.order)}
                onOpenJob={setSelectedJobId}
                focusedJobId={focusedJobId}
              />
            ))}
          </div>
        </DndContext>
      )}

      <JobDialog
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
