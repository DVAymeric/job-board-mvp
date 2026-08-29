"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Job } from "@prisma/client";
import { Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteModal } from "@/components/ui/confirm-delete-modal";
import { CompanyAvatar } from "@/components/board/company-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FOLLOW_UP_BADGE_CLASSNAME,
  needsFollowUp,
  STATUS,
  STATUS_CONFIG,
  JobStatus,
} from "@/lib/constants";
import type { JobWithRelations } from "@/lib/types";
import { cn, formatDateFr } from "@/lib/utils";
import { deleteJob } from "@/app/actions";
import { toast } from "sonner";

function getDisplayTitle(job: Job): string {
  if (job.title) return job.title;
  if (job.companyName) return job.companyName;
  try {
    return new URL(job.url).hostname.replace(/^www\./, "");
  } catch {
    return job.url;
  }
}

export function JobCard({
  job,
  onOpen,
  onDeleted,
  focused = false,
}: {
  job: JobWithRelations;
  onOpen: (id: string) => void;
  onDeleted?: (id: string) => void;
  focused?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: job.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const displayName = getDisplayTitle(job);

  async function handleDelete(): Promise<boolean> {
    const result = await deleteJob(job.id);
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    onDeleted?.(job.id);
    toast.success("Candidature supprimée");
    return true;
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      size="sm"
      {...listeners}
      {...attributes}
      aria-current={focused || undefined}
      onClick={() => onOpen(job.id)}
      className={cn(
        // Pas de touch-action:none (JOB-108) : le TouchSensor du board
        // (délai d'activation) a besoin que le navigateur garde la main sur
        // le geste tactile tant que le drag n'est pas activé, pour pouvoir
        // démarrer un scroll horizontal natif (swipe rapide) plutôt qu'un
        // drag de carte. Voir sensors dans board.tsx.
        "cursor-grab select-none border-l-4 shadow-card transition-[transform,box-shadow] duration-150 ease-out active:cursor-grabbing motion-reduce:transition-none",
        "hover:-translate-y-0.5 hover:shadow-md",
        STATUS_CONFIG[job.status as JobStatus]?.accentBorderLeftClassName,
        // Liseré plus marqué pour Entretien ; traitement assourdi pour Refusé
        // (JOB-95) — étend accentBorderLeftClassName plutôt que d'introduire
        // un nouveau composant. Désaturation seule (pas d'opacity) : opacity
        // dilue aussi le texte vers le fond clair et fait chuter le contraste
        // sous le seuil AA (JOB-104).
        job.status === STATUS.INTERVIEW && "border-l-8",
        job.status === STATUS.REJECTED && "saturate-50 hover:saturate-100",
        isDragging && "z-10 opacity-60",
        focused && "ring-2 ring-ring ring-offset-2 ring-offset-background"
      )}
    >
      <CardContent className="space-y-2">
        <div className="flex items-start gap-2">
          <CompanyAvatar job={job} />
          <div className="min-w-0 flex-1">
            {job.enrichmentStatus === "PENDING" ? (
              <div
                data-testid="job-card-enriching"
                aria-label="Récupération du titre en cours"
                aria-busy="true"
                className="space-y-1.5 py-0.5"
              >
                <Skeleton shape="line" className="h-3.5 w-3/4 bg-palette-poudre" />
                <Skeleton shape="line" className="h-2.5 w-1/2 bg-palette-lilas/40" />
              </div>
            ) : job.enrichmentStatus === "FAILED" ? (
              <p className="font-heading text-base leading-snug text-muted-foreground italic">
                Titre non détecté — cliquer pour renseigner manuellement
              </p>
            ) : (
              <>
                <p className="font-heading text-base leading-snug text-heading">
                  {displayName}
                </p>
                {job.title && job.companyName && (
                  <p className="text-sm text-muted-foreground">{job.companyName}</p>
                )}
              </>
            )}
          </div>
          {/* Actions rapides (JOB-96) : masquées par défaut, révélées au
              survol de la carte ou au focus clavier (Tab), sans passer par
              JobDialog. Le clic est intercepté (stopPropagation) pour ne pas
              aussi déclencher l'ouverture de la carte. */}
          <div
            className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover/card:opacity-100 focus-within:opacity-100"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Modifier"
              onClick={() => onOpen(job.id)}
            >
              <Pencil />
            </Button>
            <ConfirmDeleteModal
              trigger={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Supprimer définitivement"
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 />
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
              onConfirm={handleDelete}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={job.status as JobStatus} />
          {needsFollowUp(job) && (
            <Badge className={FOLLOW_UP_BADGE_CLASSNAME}>Relancer ?</Badge>
          )}
          {job.tags.map((jt) => (
            <Badge key={jt.tagId} variant="tag">
              {jt.tag.name}
            </Badge>
          ))}
        </div>
        <p className="font-mono text-xs text-muted-foreground">
          Ajouté le {formatDateFr(job.createdAt)}
        </p>
      </CardContent>
    </Card>
  );
}
