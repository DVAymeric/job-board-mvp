import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  value: string | number;
  tone?: "default" | "warn";
}

export function StatTile({ label, value, tone = "default" }: StatTileProps) {
  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={cn(
          "font-heading text-2xl text-heading",
          tone === "warn" && "text-warn"
        )}
      >
        {value}
      </p>
    </div>
  );
}
