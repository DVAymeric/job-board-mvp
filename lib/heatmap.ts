// Fenêtre par défaut alignée sur le mockup ("Régularité de vos candidatures
// (30 derniers jours)", JOB-126) — remplace l'ancienne fenêtre fixe de 53
// semaines (~1 an). Reste paramétrable pour ne pas figer ce choix.
const DEFAULT_WINDOW_DAYS = 30;

export type HeatmapDay = {
  date: string;
  count: number;
  level: number;
};

function toDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// `levels` is the number of non-empty intensity steps (day 0 always means
// "no activity" on top of that): 5 for the full 6-swatch scale used
// everywhere by default, 3 for the coarser scale used by the Analytics bento
// heatmap card.
function computeLevel(count: number, max: number, levels: 3 | 5): number {
  if (count === 0) return 0;
  if (max <= 0) return 0;
  const ratio = count / max;
  if (levels === 3) {
    if (ratio <= 1 / 3) return 1;
    if (ratio <= 2 / 3) return 2;
    return 3;
  }
  if (ratio <= 0.2) return 1;
  if (ratio <= 0.4) return 2;
  if (ratio <= 0.6) return 3;
  if (ratio <= 0.8) return 4;
  return 5;
}

export function buildHeatmapDays(
  jobs: { createdAt: Date }[],
  today: Date = new Date(),
  levels: 3 | 5 = 5,
  windowDays: number = DEFAULT_WINDOW_DAYS
): HeatmapDay[] {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end);
  start.setDate(start.getDate() - (windowDays - 1));

  const counts = new Map<string, number>();
  for (const job of jobs) {
    const key = toDateKey(new Date(job.createdAt));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const max = Math.max(0, ...counts.values());

  const days: HeatmapDay[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const key = toDateKey(cursor);
    const count = counts.get(key) ?? 0;
    days.push({ date: key, count, level: computeLevel(count, max, levels) });
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}
