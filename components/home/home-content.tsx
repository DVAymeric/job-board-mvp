"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { Job } from "@prisma/client";
import { HeroSection } from "@/components/home/hero-section";
import { UrlCheckBar } from "@/components/home/url-check-bar";
import { SearchForm, type SearchCriteria } from "@/components/search/search-form";
import { checkJobUrl, createJob } from "@/app/actions";
import { STATUS, STATUS_CONFIG, JobStatus } from "@/lib/constants";
import { toast } from "sonner";

type ViewState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "error"; message: string; requiresAuth?: boolean }
  | { kind: "known"; job: Job }
  | {
      kind: "created";
      title: string | null;
      companyName: string | null;
      enrichmentStatus: "PENDING" | "DONE";
    };

function HomeContentInner({ signedIn }: { signedIn: boolean }) {
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
      setView({ kind: "error", message: result.error, requiresAuth: result.code === "UNAUTHENTICATED" });
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
      setView({
        kind: "error",
        message: createResult.error,
        requiresAuth: createResult.code === "UNAUTHENTICATED",
      });
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
    // JOB-139 : pour un visiteur non connecté, ce contrôle échouerait de
    // toute façon avec UNAUTHENTICATED — inutile de le déclencher (et donc
    // de risquer d'afficher cette erreur) pour quelqu'un qui n'a pas encore
    // de compte pour la recevoir.
    if (!signedIn) return;
    queueMicrotask(() => {
      void runCheck(bookmarkletUrl, fallbackTitle);
    });
  }, [searchParams, router, runCheck, signedIn]);

  const checking = view.kind === "checking";

  // JOB-139 : la recherche redirige vers /recherche avec les critères déjà
  // saisis en query string — jamais d'appel serveur depuis la hero, donc
  // aucun risque d'erreur d'authentification pour cette action principale.
  function handleSearch(criteria: SearchCriteria) {
    const params = new URLSearchParams();
    if (criteria.keyword.trim()) params.set("keyword", criteria.keyword.trim());
    if (criteria.location.trim()) params.set("location", criteria.location.trim());
    if (criteria.contractType) params.set("contractType", criteria.contractType);
    const query = params.toString();
    router.push(query ? `/recherche?${query}` : "/recherche");
  }

  return (
    <HeroSection>
      <SearchForm onSearch={handleSearch} />

      {/* JOB-139 : "vérifier une offre déjà postulée" devient une action
          secondaire, sous la recherche — jamais la première interaction de
          la page. Pour un visiteur non connecté, ce n'est qu'un lien vers
          la connexion : le contrôle réel (checkJobUrl) n'est jamais
          déclenché sans compte, donc ne peut jamais renvoyer l'erreur
          "vous devez être connecté" depuis la hero. */}
      {signedIn ? (
        <div className="w-full max-w-lg space-y-2">
          <p className="text-sm text-muted-foreground">
            Vous avez déjà postulé à une offre précise ?
          </p>
          <UrlCheckBar
            url={url}
            checking={checking}
            error={view.kind === "error" ? view.message : null}
            signupHref={view.kind === "error" && view.requiresAuth ? "/register" : null}
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
              className="w-full max-w-lg space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card"
            >
              <p className="text-sm font-medium">
                Déjà postulé le{" "}
                {new Date(view.job.createdAt).toLocaleDateString("fr-FR")} —
                statut :{" "}
                {STATUS_CONFIG[view.job.status as JobStatus]?.label ?? view.job.status}
              </p>
              <Link
                href="/board"
                className="inline-block text-sm text-primary underline underline-offset-2 hover:text-heading"
              >
                Voir et modifier dans le board
              </Link>
            </div>
          )}

          {view.kind === "created" && (
            <div
              data-testid="created-job-card"
              className="w-full max-w-lg space-y-2 rounded-2xl border border-border bg-card p-4 shadow-card"
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
                className="inline-block text-sm text-primary underline underline-offset-2 hover:text-heading"
              >
                Voir dans le board
              </Link>
            </div>
          )}
        </div>
      ) : (
        <Link
          href="/login"
          className="text-sm text-muted-foreground underline underline-offset-2 hover:text-heading"
        >
          Déjà un compte ? Connectez-vous pour vérifier une offre déjà postulée
        </Link>
      )}
    </HeroSection>
  );
}

export default function HomeContent({ signedIn }: { signedIn: boolean }) {
  return (
    <Suspense fallback={null}>
      <HomeContentInner signedIn={signedIn} />
    </Suspense>
  );
}
