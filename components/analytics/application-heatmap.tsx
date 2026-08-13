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
            {visibleDays.map((day) => (
              <div
                key={day.date}
                data-heatmap-cell
                title={formatCellTitle(day)}
                className={cn("rounded-[2px] border border-border bg-white", cellSizeClassName)}
                style={levelStyle(day.level, levels)}
              />
            ))}
          </div>
        </div>
      </div>
      {!compact && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Moins</span>
          {Array.from({ length: levels + 1 }, (_, level) => level).map((level) => (
            <div
              key={level}
              data-legend-cell
              className="size-[11px] rounded-[2px] border border-border bg-white"
              style={levelStyle(level, levels)}
            />
          ))}
          <span>Plus</span>
        </div>
      )}
    </div>
  );
}
