import type { HeatmapDay } from "@/lib/heatmap";
import { cn } from "@/lib/utils";

// Échelle verte alignée sur le mockup (JOB-126) : une seule teinte
// (--brand-positive, déjà auditée AA en JOB-112) déclinée en opacité
// croissante, plutôt que l'ancien dégradé violet multi-teintes --chart-*/
// --palette-orchidee. Un seul index par niveau (pas de tableau séparé
// 3 vs 5 côtés) : le pourcentage d'opacité augmente régulièrement jusqu'à
// couvrir le nombre de niveaux demandé.
const LEVEL_OPACITY: Record<3 | 5, number[]> = {
  5: [15, 32, 50, 68, 88],
  3: [30, 60, 90],
};

const MONTH_LABELS = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Août",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
];

function levelStyle(level: number, levels: 3 | 5): React.CSSProperties | undefined {
  if (level <= 0) return undefined;
  const opacity = LEVEL_OPACITY[levels][level - 1];
  return {
    backgroundColor: `color-mix(in srgb, var(--brand-positive) ${opacity}%, transparent)`,
  };
}

function chunkWeeks(days: HeatmapDay[]): HeatmapDay[][] {
  const weeks: HeatmapDay[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

function computeMonthLabels(weeks: HeatmapDay[][]): (string | null)[] {
  return weeks.reduce<{ lastMonth: number; labels: (string | null)[] }>(
    (acc, week) => {
      const month = new Date(week[0].date + "T00:00:00").getMonth();
      if (month === acc.lastMonth) {
        return { ...acc, labels: [...acc.labels, null] };
      }
      return { lastMonth: month, labels: [...acc.labels, MONTH_LABELS[month]] };
    },
    { lastMonth: -1, labels: [] }
  ).labels;
}

function formatCellTitle(day: HeatmapDay): string {
  const date = new Date(day.date + "T00:00:00");
  const formatted = date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const suffix = day.count > 1 ? "candidatures" : "candidature";
  return `${formatted} : ${day.count} ${suffix}`;
}

// Mêmes seuils que `computeLevel` dans lib/heatmap.ts (non exportée) — à
// garder synchronisés si ces ratios changent là-bas. Sert uniquement à
// afficher, dans la légende, le nombre de candidatures que représente
// chaque palier de couleur (RGAA : ne jamais coder l'intensité par la seule
// teinte — les cases individuelles restent trop petites, ≤11px, pour
// afficher un chiffre lisible, donc c'est la légende qui porte le chiffre).
const LEVEL_THRESHOLDS: Record<3 | 5, number[]> = {
  5: [0.2, 0.4, 0.6, 0.8, 1],
  3: [1 / 3, 2 / 3, 1],
};

function legendCount(level: number, levels: 3 | 5, max: number): number {
  if (level <= 0 || max <= 0) return 0;
  const threshold = LEVEL_THRESHOLDS[levels][level - 1];
  return Math.max(1, Math.round(threshold * max));
}

export function ApplicationHeatmap({
  days,
  compact = false,
  levels = 5,
}: {
  days: HeatmapDay[];
  compact?: boolean;
  levels?: 3 | 5;
}) {
  // La fenêtre de temps (30 jours par défaut, JOB-126) est décidée par
  // l'appelant via buildHeatmapDays — le composant ne re-découpe plus lui-même
  // les jours reçus, `compact` ne contrôle plus que la taille des cases et la
  // présence de la légende/des labels de mois.
  const weeks = chunkWeeks(days);
  const monthLabels = computeMonthLabels(weeks);
  const cellSizeClassName = compact ? "size-[8px]" : "size-[11px]";
  const maxCount = Math.max(0, ...days.map((d) => d.count));

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-1">
          {!compact && (
            <div
              data-testid="heatmap-month-labels"
              className="grid gap-[3px]"
              style={{ gridTemplateColumns: `repeat(${weeks.length}, 11px)` }}
            >
              {monthLabels.map((label, index) => (
                <span
                  key={index}
                  className="text-[10px] leading-none text-muted-foreground"
                >
                  {label ?? ""}
                </span>
              ))}
            </div>
          )}
          <div className="grid grid-flow-col grid-rows-7 gap-[3px]">
            {days.map((day) => {
              const label = formatCellTitle(day);
              return (
                <div
                  key={day.date}
                  data-heatmap-cell
                  title={label}
                  aria-label={label}
                  className={cn("rounded-[2px] border border-border bg-muted", cellSizeClassName)}
                  style={levelStyle(day.level, levels)}
                />
              );
            })}
          </div>
        </div>
      </div>
      {!compact && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Moins</span>
          {Array.from({ length: levels + 1 }, (_, level) => level).map((level) => (
            <div key={level} className="flex flex-col items-center gap-0.5">
              <div
                data-legend-cell
                className="size-[11px] rounded-[2px] border border-border bg-muted"
                style={levelStyle(level, levels)}
              />
              <span data-legend-count className="font-mono text-[10px] leading-none">
                {legendCount(level, levels, maxCount)}
              </span>
            </div>
          ))}
          <span>Plus</span>
        </div>
      )}
    </div>
  );
}
