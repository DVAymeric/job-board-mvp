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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  archiveJob,
  deleteJob,
  markFollowUpToday,
  updateJobDetails,
} from "@/app/actions";

const PERMANENT_DELETE_PHRASE = "SUPPRIMER";

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
  const [title, setTitle] = useState(job?.title ?? "");
  const [companyName, setCompanyName] = useState(job?.companyName ?? "");
  const [saving, setSaving] = useState(false);
  const [marking, setMarking] = useState(false);
  const [permanentDeleteConfirmation, setPermanentDeleteConfirmation] =
    useState("");

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
    const result = await updateJobDetails(job.id, title, companyName);
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onUpdated({
      ...job,
      title: title.trim() || null,
      companyName: companyName.trim() || null,
    });
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

  async function handleArchive() {
    if (!job) return;
    const result = await archiveJob(job.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onDeleted(job.id);
    toast.success("Candidature archivée");
  }

  async function handlePermanentDelete() {
    if (!job) return;
    const result = await deleteJob(job.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onDeleted(job.id);
    toast.success("Candidature supprimée définitivement");
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
            <label htmlFor="job-title" className="text-sm font-medium">
              Titre du poste
            </label>
            <Input
              id="job-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="job-company" className="text-sm font-medium">
              Entreprise
            </label>
            <div className="flex gap-2">
              <Input
                id="job-company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={saving}
              />
              <Button
                onClick={handleSaveTitle}
                disabled={
                  saving ||
                  (title === (job.title ?? "") &&
                    companyName === (job.companyName ?? ""))
                }
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

        <SheetFooter className="gap-2">
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" />}>
              Archiver
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Archiver cette candidature ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Elle disparaîtra du board mais restera consultable dans les
                  archives.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={handleArchive}>
                  Confirmer l&apos;archivage
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

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
                  Cette action efface la candidature sans passer par les
                  archives et ne peut pas être annulée. Tape{" "}
                  <strong>{PERMANENT_DELETE_PHRASE}</strong> pour confirmer.
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
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
