"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, CircleAlert } from "lucide-react";
import type { Job } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { checkJobUrl, createJob } from "@/app/actions";
import { STATUS, STATUS_CONFIG, JobStatus } from "@/lib/constants";
import { toast } from "sonner";

type ViewState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "error"; message: string }
  | { kind: "known"; job: Job }
  | { kind: "new"; normalizedUrl: string };

export default function Home() {
  const [url, setUrl] = useState("");
  const [view, setView] = useState<ViewState>({ kind: "idle" });
  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [initialStatus, setInitialStatus] = useState<JobStatus>(
    STATUS.TO_APPLY
  );
  const [saving, setSaving] = useState(false);

  async function runCheck() {
    const trimmed = url.trim();
    if (!trimmed) {
      setView({ kind: "idle" });
      return;
    }
    setView({ kind: "checking" });
    const result = await checkJobUrl(trimmed);
    if (!result.ok) {
      setView({ kind: "error", message: result.error });
      return;
    }
    if (result.data.found) {
      setView({ kind: "known", job: result.data.job as Job });
    } else {
      setView({ kind: "new", normalizedUrl: result.data.normalizedUrl });
      setTitle("");
      setCompanyName("");
      setInitialStatus(STATUS.TO_APPLY);
    }
  }

  async function handleSave() {
    if (view.kind !== "new") return;
    setSaving(true);
    const result = await createJob({
      url: view.normalizedUrl,
      title,
      companyName,
      status: initialStatus,
    });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Candidature enregistrée");
    setUrl("");
    setTitle("");
    setCompanyName("");
    setInitialStatus(STATUS.TO_APPLY);
    setView({ kind: "idle" });
  }

  const checking = view.kind === "checking";

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="w-full max-w-xl space-y-6">
        <div className="space-y-1 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Suivi de candidatures
          </p>
          <h1 className="font-heading text-2xl text-heading">
            Colle une offre
          </h1>
          <p className="text-sm text-muted-foreground">
            On vérifie si tu l&apos;as déjà suivie, sinon on l&apos;ajoute.
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            autoFocus
            value={url}
            disabled={checking}
            placeholder="Colle l'URL de l'offre d'emploi ici..."
            onChange={(e) => {
              setUrl(e.target.value);
              if (view.kind !== "idle" && view.kind !== "checking") {
                setView({ kind: "idle" });
              }
            }}
            onBlur={runCheck}
            onKeyDown={(e) => {
              if (e.key === "Enter") runCheck();
            }}
            className="h-11 text-base"
          />
          <Button
            onClick={runCheck}
            disabled={checking || !url.trim()}
            className="h-11"
          >
            {checking && <Loader2 className="animate-spin" />}
            Vérifier
          </Button>
        </div>

        {view.kind === "error" && (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertTitle>{view.message}</AlertTitle>
            <AlertDescription>
              Vérifie que l&apos;URL est complète (ex : https://exemple.com/offre).
            </AlertDescription>
          </Alert>
        )}

        {view.kind === "known" && (
          <Alert>
            <AlertTitle>
              Déjà postulé le{" "}
              {new Date(view.job.createdAt).toLocaleDateString("fr-FR")} —
              statut : {STATUS_CONFIG[view.job.status as JobStatus]?.label ?? view.job.status}
            </AlertTitle>
            <AlertDescription>
              <Link href="/board" className="underline underline-offset-2">
                Voir et modifier dans le board
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {view.kind === "new" && (
          <div className="space-y-3 rounded-lg border-2 border-accent-border bg-card p-4">
            <p className="text-sm text-muted-foreground">
              Nouvelle offre — ajoute-la à ton suivi.
            </p>
            <Input
              placeholder="Titre du poste"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={saving}
            />
            <Input
              placeholder="Entreprise"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              disabled={saving}
            />
            <Select
              value={initialStatus}
              onValueChange={(value) => setInitialStatus(value as JobStatus)}
            >
              <SelectTrigger className="w-full" disabled={saving}>
                <SelectValue>
                  {(value: JobStatus) => STATUS_CONFIG[value]?.label ?? value}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={STATUS.TO_APPLY}>
                  {STATUS_CONFIG.TO_APPLY.label}
                </SelectItem>
                <SelectItem value={STATUS.APPLIED}>
                  {STATUS_CONFIG.APPLIED.label}
                </SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving && <Loader2 className="animate-spin" />}
              Enregistrer
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
