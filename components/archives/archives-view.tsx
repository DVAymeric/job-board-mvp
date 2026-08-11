"use client";

import { useMemo, useState } from "react";
import type { JobWithRelations } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CompanyAvatar } from "@/components/board/company-avatar";
import { STATUS_CONFIG, JobStatus } from "@/lib/constants";
import { matchesJobQuery } from "@/lib/job-filters";
import { deleteJob, unarchiveJob } from "@/app/actions";
import { toast } from "sonner";

const PERMANENT_DELETE_PHRASE = "SUPPRIMER";

type SortOption = "recent" | "title";

function ArchivedJobRow({
  job,
  onUnarchived,
  onDeleted,
}: {
  job: JobWithRelations;
  onUnarchived: (id: string) => void;
  onDeleted: (id: string) => void;
}) {
  const [permanentDeleteConfirmation, setPermanentDeleteConfirmation] =
    useState("");

  async function handleUnarchive() {
    const result = await unarchiveJob(job.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onUnarchived(job.id);
    toast.success("Candidature désarchivée");
  }

  async function handlePermanentDelete() {
    const result = await deleteJob(job.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onDeleted(job.id);
    toast.success("Candidature supprimée définitivement");
  }

  const displayName =
    job.title || job.companyName || job.url.replace(/^https?:\/\//, "");

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
      <CompanyAvatar job={job} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-heading text-sm text-heading">{displayName}</p>
        <p className="truncate text-xs text-muted-foreground">
          {STATUS_CONFIG[job.status as JobStatus]?.label ?? job.status} — archivée le{" "}
          {new Date(job.updatedAt).toLocaleDateString("fr-FR")}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={handleUnarchive}>
        Désarchiver
      </Button>
      <AlertDialog
        onOpenChange={(open) => {
          if (!open) setPermanentDeleteConfirmation("");
        }}
      >
        <AlertDialogTrigger
          render={<Button variant="ghost" size="sm" className="text-destructive" />}
        >
          Supprimer définitivement
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer définitivement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action efface la candidature et ne peut pas être annulée.
              Tape <strong>{PERMANENT_DELETE_PHRASE}</strong> pour confirmer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={permanentDeleteConfirmation}
            onChange={(e) => setPermanentDeleteConfirmation(e.target.value)}
            placeholder={PERMANENT_DELETE_PHRASE}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={permanentDeleteConfirmation !== PERMANENT_DELETE_PHRASE}
              onClick={handlePermanentDelete}
            >
              Supprimer définitivement (irréversible)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function ArchivesView({
  initialJobs,
}: {
  initialJobs: JobWithRelations[];
}) {
  const [jobs, setJobs] = useState(initialJobs);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  const visibleJobs = useMemo(() => {
    const filtered = jobs.filter((j) => matchesJobQuery(j, search));
    const sorted = [...filtered];
    if (sortBy === "title") {
      sorted.sort((a, b) =>
        (a.title ?? a.companyName ?? a.url).localeCompare(
          b.title ?? b.companyName ?? b.url
        )
      );
    } else {
      sorted.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    }
    return sorted;
  }, [jobs, search, sortBy]);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-heading text-xl text-heading">Archives</h1>
        <div className="flex items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un titre, une entreprise, une URL..."
            className="h-8 max-w-xs"
          />
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger size="sm">
              <SelectValue>
                {(v: SortOption) => (v === "title" ? "Titre (A→Z)" : "Plus récent")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Plus récent</SelectItem>
              <SelectItem value="title">Titre (A→Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {visibleJobs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {jobs.length === 0
            ? "Aucune candidature archivée"
            : "Aucune candidature ne correspond"}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {visibleJobs.map((job) => (
            <ArchivedJobRow
              key={job.id}
              job={job}
              onUnarchived={(id) => setJobs((prev) => prev.filter((j) => j.id !== id))}
              onDeleted={(id) => setJobs((prev) => prev.filter((j) => j.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
