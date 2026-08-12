const WEEKS = 53;
const DAYS_IN_WEEK = 7;

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

function computeLevel(count: number, max: number): number {
  if (count === 0) return 0;
  if (max <= 0) return 0;
  const ratio = count / max;
  if (ratio <= 0.2) return 1;
  if (ratio <= 0.4) return 2;
  if (ratio <= 0.6) return 3;
  if (ratio <= 0.8) return 4;
  return 5;
}

export function buildHeatmapDays(
  jobs: { createdAt: Date }[],
  today: Date = new Date()
): HeatmapDay[] {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end);
  start.setDate(start.getDate() - (WEEKS * DAYS_IN_WEEK - 1));
  start.setDate(start.getDate() - start.getDay());

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
    days.push({ date: key, count, level: computeLevel(count, max) });
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}
