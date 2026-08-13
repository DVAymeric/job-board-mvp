"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { Job } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HeroSection } from "@/components/home/hero-section";
import { UrlCheckBar } from "@/components/home/url-check-bar";
import {
  checkJobUrl,
  checkRepost,
  createJob,
  fetchCompanyLogo,
  fetchJobMetadata,
  reactivateJobWithContent,
} from "@/app/actions";
import { STATUS, STATUS_CONFIG, JobStatus } from "@/lib/constants";
import type { DiffLine } from "@/lib/repost-diff";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ViewState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "error"; message: string }
  | { kind: "known"; job: Job }
  | { kind: "new"; normalizedUrl: string };

type RepostFresh = {
  title: string | null;
  companyName: string | null;
  descriptionText: string | null;
};

type RepostState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "error"; message: string }
  | { kind: "result"; changed: boolean; diff: DiffLine[]; fresh: RepostFresh };

function HomeContentInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const consumedBookmarklet = useRef(false);
  const [url, setUrl] = useState(() => searchParams.get("url") ?? "");
  const [view, setView] = useState<ViewState>({ kind: "idle" });
  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyLogoUrl, setCompanyLogoUrl] = useState("");
  const [descriptionText, setDescriptionText] = useState<string | null>(null);
  const [initialStatus, setInitialStatus] = useState<JobStatus>(
    STATUS.TO_APPLY
  );
  const [saving, setSaving] = useState(false);
  const [repostState, setRepostState] = useState<RepostState>({ kind: "idle" });
  const [reactivating, setReactivating] = useState(false);

  const runCheck = useCallback(async (explicitUrl?: string, fallbackTitle?: string) => {
    const trimmed = (explicitUrl ?? url).trim();
    if (!trimmed) {
      setView({ kind: "idle" });
      return;
    }
    setView({ kind: "checking" });
    setRepostState({ kind: "idle" });
    const result = await checkJobUrl(trimmed);
    if (!result.ok) {
      setView({ kind: "error", message: result.error });
      return;
    }
    if (result.data.found) {
      setView({ kind: "known", job: result.data.job as Job });
    } else {
      const normalizedUrl = result.data.normalizedUrl;
      const [metadata, logo] = await Promise.all([
        fetchJobMetadata(normalizedUrl),
        fetchCompanyLogo(normalizedUrl),
      ]);
      const metadataTitle = metadata.ok ? metadata.data.title : null;
      setView({ kind: "new", normalizedUrl });
      setTitle(metadataTitle || fallbackTitle || "");
      setCompanyName(metadata.ok ? metadata.data.companyName ?? "" : "");
      setCompanyLogoUrl(logo.ok ? logo.data.logoUrl ?? "" : "");
      setDescriptionText(metadata.ok ? metadata.data.descriptionText : null);
      setInitialStatus(STATUS.TO_APPLY);
    }
  }, [url]);

  useEffect(() => {
    if (consumedBookmarklet.current) return;
    const bookmarkletUrl = searchParams.get("url");
    if (!bookmarkletUrl) return;
    consumedBookmarklet.current = true;
    const fallbackTitle = searchParams.get("title") ?? undefined;
    router.replace("/");
    queueMicrotask(() => {
      void runCheck(bookmarkletUrl, fallbackTitle);
    });
  }, [searchParams, router, runCheck]);

  async function handleSave() {
    if (view.kind !== "new") return;
    setSaving(true);
    const result = await createJob({
      url: view.normalizedUrl,
      title,
      companyName,
      companyLogoUrl,
      descriptionText: descriptionText ?? undefined,
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
    setCompanyLogoUrl("");
    setDescriptionText(null);
    setInitialStatus(STATUS.TO_APPLY);
    setView({ kind: "idle" });
  }

  async function handleCheckRepost() {
    if (view.kind !== "known") return;
    setRepostState({ kind: "checking" });
    const result = await checkRepost(view.job.id);
    if (!result.ok) {
      setRepostState({ kind: "error", message: result.error });
      return;
    }
    setRepostState({ kind: "result", ...result.data });
  }

  async function handleReactivate() {
    if (view.kind !== "known" || repostState.kind !== "result") return;
    setReactivating(true);
    const result = await reactivateJobWithContent({
      id: view.job.id,
      title: repostState.fresh.title,
      companyName: repostState.fresh.companyName,
      descriptionText: repostState.fresh.descriptionText,
    });
    setReactivating(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Candidature réactivée");
    setUrl("");
    setRepostState({ kind: "idle" });
    setView({ kind: "idle" });
  }

  const checking = view.kind === "checking";

  return (
    <HeroSection>
      <UrlCheckBar
        url={url}
        checking={checking}
        error={view.kind === "error" ? view.message : null}
        resultTag={
          view.kind === "known"
            ? { kind: "known", label: "Déjà dans votre board" }
            : view.kind === "new"
              ? { kind: "new", label: "Nouvelle offre" }
              : null
        }
        onUrlChange={(value) => {
          setUrl(value);
          if (view.kind !== "idle" && view.kind !== "checking") {
            setView({ kind: "idle" });
          }
        }}
        onBlur={() => runCheck()}
        onCheck={() => runCheck()}
        onKeyDown={(e) => {
          if (e.key === "Enter") runCheck();
        }}
      />

      {view.kind === "known" && (
        <div
          data-testid="known-job-card"
          className="w-full max-w-lg space-y-3 rounded-2xl border border-white/15 bg-white/10 p-4 text-white backdrop-blur-sm"
        >
          <p className="text-sm font-medium">
            Déjà postulé le{" "}
            {new Date(view.job.createdAt).toLocaleDateString("fr-FR")} —
            statut :{" "}
            {STATUS_CONFIG[view.job.status as JobStatus]?.label ?? view.job.status}
          </p>
          <Link
            href="/board"
            className="inline-block text-sm text-white/80 underline underline-offset-2 hover:text-white"
          >
            Voir et modifier dans le board
          </Link>

          {view.job.archived && (
            <div className="space-y-3 border-t border-white/15 pt-3">
              <p className="text-sm text-white/70">
                Cette offre est archivée. Vérifie si elle a été republiée
                avec un contenu différent.
              </p>
              <Button
                variant="outline"
                onClick={handleCheckRepost}
                disabled={repostState.kind === "checking"}
                className="border-white/20 bg-white/10 text-white hover:bg-white/20"
              >
                {repostState.kind === "checking" && (
                  <Loader2 className="animate-spin" />
                )}
                Vérifier si l&apos;offre a changé
              </Button>

              {repostState.kind === "error" && (
                <p className="text-sm text-[#f0a0a0]">{repostState.message}</p>
              )}

              {repostState.kind === "result" && !repostState.changed && (
                <p className="text-sm text-white/70">
                  Aucun changement de contenu détecté depuis l&apos;archivage.
                </p>
              )}

              {repostState.kind === "result" && repostState.changed && (
                <ul className="space-y-0.5 rounded-md border border-white/15 bg-white/5 p-2 font-mono text-xs">
                  {repostState.diff.map((line, index) => (
                    <li
                      key={index}
                      className={cn(
                        "whitespace-pre-wrap",
                        line.type === "removed" &&
                          "text-[#f0a0a0] line-through",
                        line.type === "added" && "font-medium text-white",
                        line.type === "unchanged" && "text-white/50"
                      )}
                    >
                      {line.type === "removed" ? "− " : line.type === "added" ? "+ " : "  "}
                      {line.text}
                    </li>
                  ))}
                </ul>
              )}

              {repostState.kind === "result" && (
                <Button onClick={handleReactivate} disabled={reactivating}>
                  {reactivating && <Loader2 className="animate-spin" />}
                  Réactiver avec le nouveau contenu
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {view.kind === "new" && (
        <div
          data-testid="new-job-card"
          className="w-full max-w-lg space-y-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"
        >
          <p className="text-sm text-white/70">
            Nouvelle offre — ajoute-la à ton suivi.
          </p>
          <Input
            placeholder="Titre du poste"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={saving}
            className="border-white/20 bg-transparent text-white placeholder:text-white/50 focus-visible:border-white/40 focus-visible:ring-white/30"
          />
          <Input
            placeholder="Entreprise"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            disabled={saving}
            className="border-white/20 bg-transparent text-white placeholder:text-white/50 focus-visible:border-white/40 focus-visible:ring-white/30"
          />
          <Select
            value={initialStatus}
            onValueChange={(value) => setInitialStatus(value as JobStatus)}
          >
            <SelectTrigger
              className="w-full border-white/20 bg-white/5 text-white data-placeholder:text-white/50 focus-visible:border-white/40 focus-visible:ring-white/30"
              disabled={saving}
            >
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
    </HeroSection>
  );
}

export default function HomeContent() {
  return (
    <Suspense fallback={null}>
      <HomeContentInner />
    </Suspense>
  );
}
