"use client";

import { useState } from "react";
import type { Job } from "@prisma/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  deleteJob,
  markFollowUpToday,
  updateJobDetails,
} from "@/app/actions";

export function JobSheet({
  job,
  onOpenChange,
  onUpdated,
  onDeleted,
}: {
  job: Job | null;
  onOpenChange: (open: boolean) => void;
  onUpdated: (job: Job) => void;
  onDeleted: (id: string) => void;
}) {
  const [titleCompany, setTitleCompany] = useState(job?.title ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [marking, setMarking] = useState(false);

  if (!job) {
    return (
      <Sheet open={false} onOpenChange={onOpenChange}>
        <SheetContent />
      </Sheet>
    );
  }

  async function handleSaveTitle() {
    if (!job) return;
    setSaving(true);
    const result = await updateJobDetails(job.id, titleCompany);
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onUpdated({ ...job, title: titleCompany.trim() || null });
    toast.success("Offre mise à jour");
  }

  async function handleMarkFollowUp() {
    if (!job) return;
    setMarking(true);
    const result = await markFollowUpToday(job.id);
    setMarking(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onUpdated({ ...job, lastFollowUp: new Date() });
    toast.success("Relance enregistrée");
  }

  async function handleDelete() {
    if (!job) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    const result = await deleteJob(job.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onDeleted(job.id);
    toast.success("Candidature supprimée");
  }

  return (
    <Sheet open={!!job} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Détails de la candidature</SheetTitle>
          <SheetDescription>
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 break-all"
            >
              {job.url}
            </a>
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Titre / Entreprise</label>
            <div className="flex gap-2">
              <Input
                value={titleCompany}
                onChange={(e) => setTitleCompany(e.target.value)}
                disabled={saving}
              />
              <Button
                onClick={handleSaveTitle}
                disabled={saving || titleCompany === (job.title ?? "")}
              >
                Enregistrer
              </Button>
            </div>
          </div>

          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Ajoutée le </span>
              {new Date(job.createdAt).toLocaleDateString("fr-FR")}
            </p>
            <p>
              <span className="text-muted-foreground">Dernière relance : </span>
              {job.lastFollowUp
                ? new Date(job.lastFollowUp).toLocaleDateString("fr-FR")
                : "jamais"}
            </p>
          </div>

          <Button variant="outline" onClick={handleMarkFollowUp} disabled={marking}>
            Marquer comme relancé aujourd&apos;hui
          </Button>
        </div>

        <SheetFooter>
          <Button
            variant="destructive"
            onClick={handleDelete}
            onBlur={() => setConfirmingDelete(false)}
          >
            {confirmingDelete ? "Confirmer la suppression" : "Supprimer"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
