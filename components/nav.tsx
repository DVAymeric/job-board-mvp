"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BackupControls } from "@/components/backup/backup-controls";
import { exportJobsCsv } from "@/app/actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/board", label: "Board" },
  { href: "/archives", label: "Archives" },
  { href: "/analytics", label: "Analytics" },
  { href: "/comparateur", label: "Comparateur" },
] as const;

export function Nav() {
  const pathname = usePathname();
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    const result = await exportJobsCsv();
    setExporting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const blob = new Blob([result.data.csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `candidatures-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <header className="flex items-center gap-4 border-b border-border bg-white px-4 py-3">
      <span className="mr-2 flex items-center gap-2 font-heading text-base font-bold text-heading">
        <span className="size-2 rounded-full bg-primary" />
        JobTracker
      </span>
      <nav className="flex flex-1 items-center gap-4">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "border-b-2 border-transparent py-1 text-sm font-medium transition-colors hover:text-heading",
              pathname === link.href
                ? "border-primary text-heading"
                : "text-muted-foreground"
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
        {exporting && <Loader2 className="animate-spin" />}
        Exporter CSV
      </Button>
      <BackupControls />
    </header>
  );
}
