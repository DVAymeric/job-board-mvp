"use client";

import { useDraggable } from "@dnd-kit/core";
import type { Job } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FOLLOW_UP_BADGE_CLASSNAME,
  FOLLOW_UP_DAYS,
  STATUS,
  STATUS_CONFIG,
  JobStatus,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

function getDisplayName(job: Job): string {
  if (job.titleCompany) return job.titleCompany;
  try {
    return new URL(job.url).hostname.replace(/^www\./, "");
  } catch {
    return job.url;
  }
}

function needsFollowUp(job: Job): boolean {
  if (job.status !== STATUS.APPLIED) return false;
  const reference = job.lastFollowUp ?? job.createdAt;
  const days =
    (Date.now() - new Date(reference).getTime()) / (1000 * 60 * 60 * 24);
  return days >= FOLLOW_UP_DAYS;
}

export function JobCard({
  job,
  onOpen,
}: {
  job: Job;
  onOpen: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: job.id });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(job.id)}
      className={cn(
        "cursor-grab touch-none select-none active:cursor-grabbing",
        isDragging && "z-10 opacity-60"
      )}
    >
      <CardContent className="space-y-2">
        <div className="h-1 w-8 rounded-full bg-gradient-to-r from-accent-border to-primary" />
        <p className="text-sm font-medium leading-snug text-heading">
          {getDisplayName(job)}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className={STATUS_CONFIG[job.status as JobStatus]?.badgeClassName}>
            {STATUS_CONFIG[job.status as JobStatus]?.label ?? job.status}
          </Badge>
          {needsFollowUp(job) && (
            <Badge className={FOLLOW_UP_BADGE_CLASSNAME}>Relancer ?</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Ajouté le {new Date(job.createdAt).toLocaleDateString("fr-FR")}
        </p>
      </CardContent>
    </Card>
  );
}

export { needsFollowUp };
