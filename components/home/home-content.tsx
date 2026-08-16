"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { Job } from "@prisma/client";
import { HeroSection } from "@/components/home/hero-section";
import { UrlCheckBar } from "@/components/home/url-check-bar";
import { checkJobUrl, createJob } from "@/app/actions";
import { STATUS, STATUS_CONFIG, JobStatus } from "@/lib/constants";
import { toast } from "sonner";

type ViewState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "error"; message: string }
  | { kind: "known"; job: Job }
  | {
      kind: "created";
      title: string | null;
      companyName: string | null;
      enrichmentStatus: "PENDING" | "DONE";
    };

function HomeContentInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const consumedBookmarklet = useRef(false);
  const [url, setUrl] = useState(() => searchParams.get("url") ?? "");
  const [view, setView] = useState<ViewState>({ kind: "idle" });

  // Vérification (checkJobUrl, une seule requête en base) et création
  // (createJob) sont deux Server Actions déjà distinctes côté serveur — ce
  // qui les couplait, c'était d'attendre le scraping *entre les deux* ici.
  // createJob ne bloque plus dessus : la candidature est créée dès que
  // l'URL est confirmée nouvelle, avec un enrichissement (titre/entreprise/
  // logo) qui continue en tâche de fond côté serveur (JOB-ASYNC-ENRICH).
  const runCheck = useCallback(async (explicitUrl?: string, fallbackTitle?: string) => {
    const trimmed = (explicitUrl ?? url).trim();
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
      return;
    }

    const createResult = await createJob({
      url: result.data.normalizedUrl,
      title: fallbackTitle || undefined,
      status: STATUS.TO_APPLY,
    });

    if (!createResult.ok) {
      setView({ kind: "error", message: createResult.error });
      return;
    }

    toast.success("Candidature enregistrée");
    setUrl("");
    setView({
      kind: "created",
      title: fallbackTitle || null,
      companyName: null,
      enrichmentStatus: createResult.data.enrichmentStatus,
    });
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
        </div>
      )}

      {view.kind === "created" && (
        <div
          data-testid="created-job-card"
          className="w-full max-w-lg space-y-2 rounded-2xl border border-white/15 bg-white/10 p-4 text-white backdrop-blur-sm"
        >
          {view.enrichmentStatus === "PENDING" ? (
            <p
              data-testid="created-job-enriching"
              className="flex items-center gap-2 text-sm font-medium"
            >
              <Loader2 className="size-4 animate-spin" />
              Candidature ajoutée — récupération du titre en cours...
            </p>
          ) : (
            <p className="text-sm font-medium">
              Ajoutée : {view.title}
              {view.companyName ? ` chez ${view.companyName}` : ""}
            </p>
          )}
          <Link
            href="/board"
            className="inline-block text-sm text-white/80 underline underline-offset-2 hover:text-white"
          >
            Voir dans le board
          </Link>
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
