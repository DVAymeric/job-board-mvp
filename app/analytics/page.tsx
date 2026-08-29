import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computeStatusFunnel, computeMostActiveMonth } from "@/lib/analytics";
import { computeStatusCounts, computeFollowUpSummary } from "@/lib/home-stats";
import { buildHeatmapDays } from "@/lib/heatmap";
import { STATUS } from "@/lib/constants";
import { PageHeader } from "@/components/page-header";
import { ExportCsvButton } from "@/components/export-csv-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/analytics/stat-tile";
import { StatusList } from "@/components/analytics/status-list";
import { FunnelChart } from "@/components/analytics/funnel-chart";
import { ApplicationHeatmap } from "@/components/analytics/application-heatmap";
import { AnalyticsEmptyState } from "@/components/analytics/analytics-empty-state";

// Fenêtre de la heatmap (30 jours, JOB-126) — à ne pas confondre avec le
// funnel et la répartition par statut ci-dessous, qui restent volontairement
// non bornés dans le temps (tout l'historique de l'utilisateur, cf.
// commentaire sur la requête Prisma) : seule la heatmap a une notion de
// "fenêtre glissante" au sens propre.
const HEATMAP_WINDOW_DAYS = 30;

export default async function AnalyticsPage() {
  const session = await auth();
  const userId = session?.user?.id ?? "";

  // Agrégation en mémoire, volontairement : spike JOB-92 conclu sans
  // refactor. Le funnel (computeStatusFunnel) doit dédupliquer par job les
  // statuts atteints (un job peut repasser deux fois par un même statut,
  // sans le recompter) — ça exige `COUNT(DISTINCT jobId)` par statut, que
  // l'API typée de Prisma (`groupBy`) ne sait pas exprimer. La heatmap et le
  // mois le plus actif regroupent par jour/mois, une troncature de date que
  // Prisma ne fait pas nativement non plus. Les deux nécessiteraient du SQL
  // brut pour gagner quoi que ce soit — et comme funnel/heatmap/mois ont de
  // toute façon besoin du détail ligne par ligne, cette requête (déjà scopée
  // par userId, déjà un select minimal, déjà plafonnée par le garde-fou
  // findMany à venir si besoin) resterait incontournable : y ajouter des
  // groupBy Prisma en plus n'économiserait aucun aller-retour, seulement de
  // la complexité. À l'échelle d'un tracker personnel (des centaines de
  // lignes par utilisateur, pas des millions), le coût réel de ce calcul en
  // JS est négligeable.
  const jobs = await prisma.job.findMany({
    where: { userId },
    select: {
      status: true,
      createdAt: true,
      lastFollowUp: true,
      statusHistory: { select: { status: true } },
    },
  });

  const funnel = computeStatusFunnel(jobs);
  const statusCounts = computeStatusCounts(jobs);
  const mostActiveMonth = computeMostActiveMonth(jobs);
  const followUp = computeFollowUpSummary(jobs);
  const heatmapDays = buildHeatmapDays(jobs, undefined, 3, HEATMAP_WINDOW_DAYS);

  const appliedStage = funnel.find((s) => s.status === STATUS.APPLIED) ?? {
    count: 0,
    conversionFromPrevious: null,
  };
  const interviewStage = funnel.find((s) => s.status === STATUS.INTERVIEW) ?? {
    count: 0,
    conversionFromPrevious: null,
  };

  const activeMonthNote = mostActiveMonth
    ? `Mois le plus actif : ${mostActiveMonth.label} (${mostActiveMonth.count} candidature${mostActiveMonth.count > 1 ? "s" : ""}).`
    : undefined;

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-6 p-4">
      <PageHeader
        eyebrow="Vue d'ensemble"
        title="Analytics"
        subtitle="Suivi du funnel de conversion et de la régularité de vos candidatures — vos statistiques personnelles, jamais partagées ni agrégées avec d'autres utilisateurs sans votre accord."
        toolbar={<ExportCsvButton className="ml-auto" />}
      />

      {jobs.length === 0 ? (
        <AnalyticsEmptyState />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Candidatures envoyées" value={appliedStage.count} />
            <StatTile
              label="Taux de conversion en entretien"
              value={
                interviewStage.conversionFromPrevious === null
                  ? "—"
                  : `${interviewStage.conversionFromPrevious}%`
              }
            />
            <StatTile label="Entretiens obtenus" value={interviewStage.count} />
            <StatTile
              label="Relances à faire"
              value={followUp.count}
              tone={followUp.count > 0 ? "warn" : "default"}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Parcours de vos candidatures</CardTitle>
              </CardHeader>
              <CardContent>
                <FunnelChart stages={funnel} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Répartition actuelle</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusList statusCounts={statusCounts} note={activeMonthNote} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Régularité sur 30 jours</CardTitle>
            </CardHeader>
            <CardContent>
              <ApplicationHeatmap days={heatmapDays} levels={3} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
