import type { HeatmapDay } from "@/lib/heatmap";
import { cn } from "@/lib/utils";

const COMPACT_WEEKS = 12;

const LEVEL_VARS_5 = [
  "",
  "--chart-4",
  "--chart-3",
  "--chart-2",
  "--chart-1",
  "--chart-5",
];

const LEVEL_COLORS_3 = [
  "",
  "color-mix(in srgb, var(--palette-poudre) 40%, transparent)",
  "color-mix(in srgb, var(--palette-orchidee) 65%, transparent)",
  "var(--palette-orchidee)",
];

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
  const color =
    levels === 3 ? LEVEL_COLORS_3[level] : `var(${LEVEL_VARS_5[level]})`;
  return { backgroundColor: color };
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
  const weeks = chunkWeeks(days);
  const visibleWeeks = compact ? weeks.slice(-COMPACT_WEEKS) : weeks;
  const visibleDays = visibleWeeks.flat();
  const monthLabels = computeMonthLabels(visibleWeeks);
  const cellSizeClassName = compact ? "size-[8px]" : "size-[11px]";
  const maxCount = Math.max(0, ...visibleDays.map((d) => d.count));

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-1">
          {!compact && (
            <div
              data-testid="heatmap-month-labels"
              className="grid gap-[3px]"
              style={{ gridTemplateColumns: `repeat(${visibleWeeks.length}, 11px)` }}
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
            {visibleDays.map((day) => {
              const label = formatCellTitle(day);
              return (
                <div
                  key={day.date}
                  data-heatmap-cell
                  title={label}
                  aria-label={label}
                  className={cn("rounded-[2px] border border-border bg-white", cellSizeClassName)}
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
                className="size-[11px] rounded-[2px] border border-border bg-white"
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
