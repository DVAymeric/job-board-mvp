import type { StatusHistory } from "@prisma/client";
import { JobStatus, STATUS_CONFIG } from "@/lib/constants";

export function StatusTimeline({ history }: { history: StatusHistory[] }) {
  if (history.length === 0) return null;

  const sorted = [...history].sort(
    (a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime()
  );

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">Historique de statut</p>
      <ul className="space-y-1 text-sm">
        {sorted.map((entry) => (
          <li key={entry.id} className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">
              {new Date(entry.changedAt).toLocaleDateString("fr-FR")}
            </span>
            <span>
              {STATUS_CONFIG[entry.status as JobStatus]?.label ?? entry.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
