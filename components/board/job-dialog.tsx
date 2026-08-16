"use client";

import { useState } from "react";
import type { JobWithRelations } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteModal } from "@/components/ui/confirm-delete-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CompanyAvatar } from "@/components/board/company-avatar";
import { ContactsSection } from "@/components/board/contacts-section";
import { StatusTimeline } from "@/components/board/status-timeline";
import {
  SALARY_TYPE,
  SALARY_TYPE_LABELS,
  SALARY_TYPE_ORDER,
  type SalaryType,
} from "@/lib/constants";
import { buildInterviewIcs } from "@/lib/ics";
import { toast } from "sonner";
import { XIcon } from "lucide-react";
import {
  addTagToJob,
  deleteJob,
  markFollowUpToday,
  removeTagFromJob,
  updateJobDetails,
  updateJobDocuments,
  updateJobInterviewDate,
  updateJobNotes,
  updateJobSalary,
} from "@/app/actions";

function toDatetimeLocalValue(date: Date | null): string {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function JobDialog({
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
  const [newTagName, setNewTagName] = useState("");
  const [addingTag, setAddingTag] = useState(false);
  const [notes, setNotes] = useState(job?.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [salaryAmount, setSalaryAmount] = useState(
    job?.salaryAmount != null ? String(job.salaryAmount) : ""
  );
  const [salaryType, setSalaryType] = useState<SalaryType>(
    (job?.salaryType as SalaryType) ?? SALARY_TYPE.ANNUAL
  );
  const [savingSalary, setSavingSalary] = useState(false);
  const [resumeUrl, setResumeUrl] = useState(job?.resumeUrl ?? "");
  const [coverLetterUrl, setCoverLetterUrl] = useState(job?.coverLetterUrl ?? "");
  const [savingDocuments, setSavingDocuments] = useState(false);
  const [interviewDateInput, setInterviewDateInput] = useState(
    toDatetimeLocalValue(job?.interviewDate ?? null)
  );
  const [savingInterviewDate, setSavingInterviewDate] = useState(false);

  if (!job) {
    return (
      <Dialog open={false} onOpenChange={onOpenChange}>
        <DialogContent />
      </Dialog>
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

  async function handleSaveSalary() {
    if (!job) return;
    const amount = salaryAmount.trim() ? Number(salaryAmount) : null;
    setSavingSalary(true);
    const result = await updateJobSalary(job.id, amount, amount === null ? null : salaryType);
    setSavingSalary(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onUpdated({ ...job, salaryAmount: amount, salaryType: amount === null ? null : salaryType });
    toast.success("Rémunération enregistrée");
  }

  async function handleSaveDocuments() {
    if (!job) return;
    setSavingDocuments(true);
    const result = await updateJobDocuments(job.id, resumeUrl, coverLetterUrl);
    setSavingDocuments(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onUpdated({
      ...job,
      resumeUrl: resumeUrl.trim() || null,
      coverLetterUrl: coverLetterUrl.trim() || null,
    });
    toast.success("Documents enregistrés");
  }

  async function handleSaveInterviewDate() {
    if (!job) return;
    const isoValue = interviewDateInput ? new Date(interviewDateInput).toISOString() : null;
    setSavingInterviewDate(true);
    const result = await updateJobInterviewDate(job.id, isoValue);
    setSavingInterviewDate(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onUpdated({ ...job, interviewDate: isoValue ? new Date(isoValue) : null });
    toast.success("Date d'entretien enregistrée");
  }

  function handleExportIcs() {
    if (!job || !job.interviewDate) return;
    const ics = buildInterviewIcs({
      id: job.id,
      title: job.title,
      companyName: job.companyName,
      url: job.url,
      interviewDate: job.interviewDate,
    });
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `entretien-${job.id}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

  async function handleDelete(): Promise<boolean> {
    if (!job) return false;
    const result = await deleteJob(job.id);
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    onDeleted(job.id);
    toast.success("Candidature supprimée");
    return true;
  }

  return (
    <Dialog open={!!job} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-full max-w-lg flex-col sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <CompanyAvatar job={job} />
            <DialogTitle>Détails de la candidature</DialogTitle>
          </div>
          <DialogDescription>
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 break-all"
            >
              {job.url}
            </a>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-y-auto px-1">
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

          <div className="space-y-1.5">
            <label htmlFor="job-salary" className="text-sm font-medium">
              Rémunération
            </label>
            <div className="flex gap-2">
              <Input
                id="job-salary"
                type="number"
                min={1}
                inputMode="numeric"
                value={salaryAmount}
                onChange={(e) => setSalaryAmount(e.target.value)}
                placeholder="Montant (optionnel)"
                disabled={savingSalary}
              />
              <Select
                value={salaryType}
                onValueChange={(value) => setSalaryType(value as SalaryType)}
              >
                <SelectTrigger disabled={savingSalary}>
                  <SelectValue>
                    {(value: SalaryType) => SALARY_TYPE_LABELS[value] ?? value}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {SALARY_TYPE_ORDER.map((type) => (
                    <SelectItem key={type} value={type}>
                      {SALARY_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              onClick={handleSaveSalary}
              disabled={
                savingSalary ||
                (salaryAmount === (job.salaryAmount != null ? String(job.salaryAmount) : "") &&
                  salaryType === (job.salaryType ?? SALARY_TYPE.ANNUAL))
              }
            >
              Enregistrer le salaire
            </Button>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="job-resume-url" className="text-sm font-medium">
              CV utilisé
            </label>
            <Input
              id="job-resume-url"
              value={resumeUrl}
              onChange={(e) => setResumeUrl(e.target.value)}
              placeholder="Lien vers le CV utilisé (optionnel)"
              disabled={savingDocuments}
            />
            <label htmlFor="job-cover-letter-url" className="text-sm font-medium">
              Lettre de motivation
            </label>
            <Input
              id="job-cover-letter-url"
              value={coverLetterUrl}
              onChange={(e) => setCoverLetterUrl(e.target.value)}
              placeholder="Lien vers la lettre utilisée (optionnel)"
              disabled={savingDocuments}
            />
            <Button
              size="sm"
              onClick={handleSaveDocuments}
              disabled={
                savingDocuments ||
                (resumeUrl === (job.resumeUrl ?? "") &&
                  coverLetterUrl === (job.coverLetterUrl ?? ""))
              }
            >
              Enregistrer les documents
            </Button>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="job-interview-date" className="text-sm font-medium">
              Date d&apos;entretien
            </label>
            <div className="flex flex-wrap gap-2">
              <Input
                id="job-interview-date"
                type="datetime-local"
                value={interviewDateInput}
                onChange={(e) => setInterviewDateInput(e.target.value)}
                disabled={savingInterviewDate}
                className="w-auto"
              />
              <Button
                size="sm"
                onClick={handleSaveInterviewDate}
                disabled={
                  savingInterviewDate ||
                  interviewDateInput === toDatetimeLocalValue(job.interviewDate)
                }
              >
                Enregistrer la date d&apos;entretien
              </Button>
              {job.interviewDate && (
                <Button variant="outline" size="sm" onClick={handleExportIcs}>
                  Exporter .ics
                </Button>
              )}
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

          <StatusTimeline history={job.statusHistory} />

          <Button variant="outline" onClick={handleMarkFollowUp} disabled={marking}>
            Marquer comme relancé aujourd&apos;hui
          </Button>
        </div>

        <DialogFooter className="gap-2">
          <ConfirmDeleteModal
            trigger={<Button variant="destructive">Supprimer</Button>}
            title="Supprimer cette candidature ?"
            description={
              job.title && job.companyName
                ? `${job.title} chez ${job.companyName} sera définitivement supprimée.`
                : `${job.title || job.companyName || "Cette candidature"} sera définitivement supprimée.`
            }
            onConfirm={handleDelete}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
