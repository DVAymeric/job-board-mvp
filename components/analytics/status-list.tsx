import { StatusBadge } from "@/components/ui/status-badge";
import { STATUS_ORDER, type JobStatus } from "@/lib/constants";

interface StatusListProps {
  statusCounts: Record<JobStatus, number>;
  note?: string;
}

export function StatusList({ statusCounts, note }: StatusListProps) {
  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {STATUS_ORDER.map((status) => (
          <li key={status} className="flex items-center justify-between gap-3">
            <StatusBadge status={status} />
            <span className="font-mono text-sm font-bold text-heading">
              {statusCounts[status]}
            </span>
          </li>
        ))}
      </ul>
      {note && (
        <p
          data-status-list-note
          className="border-t border-dashed border-border pt-2 text-sm text-muted-foreground"
        >
          {note}
        </p>
      )}
    </div>
  );
}
