"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { ExportCsvButton } from "@/components/export-csv-button";
import { Column } from "@/components/board/column";
import { JobDialog } from "@/components/board/job-dialog";
import { InterviewReminderWatcher } from "@/components/board/interview-reminder-watcher";
import { EnrichmentPollWatcher } from "@/components/board/enrichment-poll-watcher";
import { needsFollowUp, STATUS, STATUS_ORDER } from "@/lib/constants";
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

  // MouseSensor (distance) + TouchSensor (delay) plutôt qu'un PointerSensor
  // unique (JOB-108) : sous 760px les colonnes défilent horizontalement au
  // doigt (scroll-snap) et les JobCard n'ont plus `touch-action: none` pour
  // laisser ce scroll natif s'amorcer. Avec un PointerSensor + distance, un
  // simple swipe tactile dépasserait les 8px et déclencherait un drag au
  // lieu de faire défiler le board. Le délai du TouchSensor laisse le
  // navigateur démarrer son scroll natif si le doigt bouge avant l'échéance
  // (dnd-kit annule alors la contrainte via `touchcancel`) ; sinon (appui
  // maintenu quasi immobile) le drag s'active. PointerSensor capterait aussi
  // les événements tactiles en plus de TouchSensor (double activation) —
  // MouseSensor n'écoute que `mousedown`, d'où son usage ici pour la souris.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    })
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
      <EnrichmentPollWatcher
        hasPendingEnrichment={jobs.some((j) => j.enrichmentStatus === "PENDING")}
      />
      <PageHeader
        title="Board"
        toolbar={
          <>
            <div className="relative min-w-40 flex-1">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un titre, une entreprise, une URL..."
                className="w-full pl-8"
              />
            </div>
            <Button
              variant={followUpOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setFollowUpOnly((v) => !v)}
              className={cn(followUpOnly && "ring-2 ring-ring/50")}
            >
              Candidatures à relancer
            </Button>
            <ExportCsvButton />
            <Button size="sm" render={<Link href="/" prefetch={false} />}>
              <Plus aria-hidden="true" />
              Ajouter une candidature
            </Button>
          </>
        }
      />

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
          {/*
            Mobile (<md, ~760px) : scroll horizontal par colonne avec
            scroll-snap plutôt que la grille 4 colonnes desktop (JOB-108).
            Chaque Column passe à ~90% de la largeur du conteneur et
            s'aligne en snap-start, laissant apparaître un aperçu de la
            colonne suivante pour inviter au swipe. `snap-mandatory` est
            retiré à partir de `md:` où les colonnes reprennent leur largeur
            égale (`flex-1`) sans confinement au scroll-snap.
          */}
          <div className="flex flex-1 snap-x snap-mandatory gap-4 overflow-x-auto md:snap-none">
            {STATUS_ORDER.map((status) => (
              <Column
                key={status}
                status={status}
                jobs={visibleJobs
                  .filter((j) => j.status === status)
                  .sort((a, b) => a.order - b.order)}
                onOpenJob={setSelectedJobId}
                onDeletedJob={handleDeleted}
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
