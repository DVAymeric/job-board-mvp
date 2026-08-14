"use client";

import { useMemo, useState } from "react";
import type { JobWithRelations } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDeleteModal } from "@/components/ui/confirm-delete-modal";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type SortOption = "recent" | "title";

function ArchivedJobCard({
  job,
  onUnarchived,
  onDeleted,
}: {
  job: JobWithRelations;
  onUnarchived: (id: string) => void;
  onDeleted: (id: string) => void;
}) {
  async function handleUnarchive() {
    const result = await unarchiveJob(job.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onUnarchived(job.id);
    toast.success("Candidature désarchivée");
  }

  async function handlePermanentDelete(): Promise<boolean> {
    const result = await deleteJob(job.id);
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    onDeleted(job.id);
    toast.success("Candidature supprimée définitivement");
    return true;
  }

  const displayName =
    job.title || job.companyName || job.url.replace(/^https?:\/\//, "");

  return (
    <Card
      className={cn(
        // Désaturation seule (pas d'opacity) : opacity dilue aussi le texte
        // vers le fond clair et fait chuter le contraste sous le seuil AA
        // (JOB-104).
        "border-l-4 saturate-[0.6] grayscale-[0.15] transition-[filter] duration-150 ease-out hover:saturate-100 hover:grayscale-0 focus-within:saturate-100 focus-within:grayscale-0 motion-reduce:transition-none",
        STATUS_CONFIG[job.status as JobStatus]?.accentBorderLeftClassName
      )}
    >
      <CardContent className="space-y-2">
        <div className="flex items-start gap-2">
          <CompanyAvatar job={job} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-sm leading-snug text-heading">
              {displayName}
            </p>
            {job.title && job.companyName && (
              <p className="truncate text-xs text-muted-foreground">
                {job.companyName}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className={STATUS_CONFIG[job.status as JobStatus]?.badgeClassName}>
            {STATUS_CONFIG[job.status as JobStatus]?.label ?? job.status}
          </Badge>
        </div>
        <p className="font-mono text-xs text-muted-foreground">
          Archivée le {new Date(job.updatedAt).toLocaleDateString("fr-FR")}
        </p>
        <div className="flex items-center gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={handleUnarchive}>
            Désarchiver
          </Button>
          <ConfirmDeleteModal
            trigger={
              <Button variant="ghost" size="sm" className="text-destructive">
                Supprimer définitivement
              </Button>
            }
            title="Supprimer cette candidature ?"
            description={
              <>
                Cette action efface définitivement{" "}
                {job.title && job.companyName
                  ? `${job.title} chez ${job.companyName}`
                  : displayName}{" "}
                et ne peut pas être annulée.
              </>
            }
            onConfirm={handlePermanentDelete}
          />
        </div>
      </CardContent>
    </Card>
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibleJobs.map((job) => (
            <ArchivedJobCard
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
