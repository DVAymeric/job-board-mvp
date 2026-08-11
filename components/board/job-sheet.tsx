"use client";

import { useState } from "react";
import type { JobWithRelations } from "@/lib/types";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CompanyAvatar } from "@/components/board/company-avatar";
import { ContactsSection } from "@/components/board/contacts-section";
import { StatusTimeline } from "@/components/board/status-timeline";
import { toast } from "sonner";
import { XIcon } from "lucide-react";
import {
  addTagToJob,
  archiveJob,
  deleteJob,
  markFollowUpToday,
  removeTagFromJob,
  updateJobDetails,
  updateJobNotes,
} from "@/app/actions";

const PERMANENT_DELETE_PHRASE = "SUPPRIMER";

export function JobSheet({
  job,
  onOpenChange,
  onUpdated,
  onDeleted,
}: {
  job: JobWithRelations | null;
  onOpenChange: (open: boolean) => void;
  onUpdated: (job: JobWithRelations) => void;
  onDeleted: (id: string) => void;
}) {
  const [title, setTitle] = useState(job?.title ?? "");
  const [companyName, setCompanyName] = useState(job?.companyName ?? "");
  const [saving, setSaving] = useState(false);
  const [marking, setMarking] = useState(false);
  const [permanentDeleteConfirmation, setPermanentDeleteConfirmation] =
    useState("");
  const [newTagName, setNewTagName] = useState("");
  const [addingTag, setAddingTag] = useState(false);
  const [notes, setNotes] = useState(job?.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);

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

  async function handleSaveNotes() {
    if (!job) return;
    setSavingNotes(true);
    const result = await updateJobNotes(job.id, notes);
    setSavingNotes(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onUpdated({ ...job, notes: notes.trim() || null });
    toast.success("Notes enregistrées");
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

  async function handleAddTag() {
    if (!job || !newTagName.trim()) return;
    setAddingTag(true);
    const result = await addTagToJob(job.id, newTagName.trim());
    setAddingTag(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const { tag } = result.data;
    if (!job.tags.some((jt) => jt.tagId === tag.id)) {
      onUpdated({
        ...job,
        tags: [...job.tags, { jobId: job.id, tagId: tag.id, tag }],
      });
    }
    setNewTagName("");
  }

  async function handleRemoveTag(tagId: string) {
    if (!job) return;
    const result = await removeTagFromJob(job.id, tagId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onUpdated({ ...job, tags: job.tags.filter((jt) => jt.tagId !== tagId) });
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
          <div className="flex items-center gap-2">
            <CompanyAvatar job={job} />
            <SheetTitle>Détails de la candidature</SheetTitle>
          </div>
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

          <div className="space-y-1.5">
            <label htmlFor="job-new-tag" className="text-sm font-medium">
              Tags
            </label>
            <div className="flex flex-wrap gap-1.5">
              {job.tags.map((jt) => (
                <Badge key={jt.tagId} variant="secondary" className="gap-1 pr-1">
                  {jt.tag.name}
                  <button
                    type="button"
                    aria-label={`Retirer le tag ${jt.tag.name}`}
                    onClick={() => handleRemoveTag(jt.tagId)}
                    className="rounded-full hover:bg-secondary-foreground/10"
                  >
                    <XIcon className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                id="job-new-tag"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Ajouter un tag..."
                disabled={addingTag}
              />
              <Button
                onClick={handleAddTag}
                disabled={addingTag || !newTagName.trim()}
              >
                Ajouter le tag
              </Button>
            </div>
          </div>

          <ContactsSection
            jobId={job.id}
            contacts={job.contacts}
            onChange={(contacts) => onUpdated({ ...job, contacts })}
          />

          <div className="space-y-1.5">
            <label htmlFor="job-notes" className="text-sm font-medium">
              Notes
            </label>
            <Textarea
              id="job-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={savingNotes}
              placeholder="Notes libres sur cette candidature..."
            />
            <Button
              size="sm"
              onClick={handleSaveNotes}
              disabled={savingNotes || notes === (job.notes ?? "")}
            >
              Enregistrer les notes
            </Button>
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

          <StatusTimeline history={job.statusHistory} />

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
