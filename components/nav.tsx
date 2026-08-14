"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleUser, FileDown, Loader2, LogOut } from "lucide-react";
import type { Session } from "next-auth";
import { Button, buttonVariants } from "@/components/ui/button";
import { BackupControls } from "@/components/backup/backup-controls";
import { exportJobsCsv } from "@/app/actions";
import { logoutAction } from "@/app/auth-actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Exporter CSV/JSON et Importer JSON n'ont de sens que là où il y a des
// candidatures à exporter/remplacer : le board et l'Analytics. Ailleurs
// (accueil, archives, compte) ces actions n'apparaissent pas.
const EXPORT_IMPORT_PATHS = ["/board", "/analytics"] as const;

// prefetch: false sur les routes protégées (JOB-131) — le prefetch par
// défaut de <Link> déclenche des GET en arrière-plan avec le cookie de
// session encore valide au moment de l'envoi ; si l'un d'eux arrive après un
// logout, le serveur le traite comme authentifié et réémet un cookie de
// session valide, ressuscitant la session juste effacée. "/" n'est pas
// protégée, aucun risque à la préfetcher.
const LINKS = [
  { href: "/", label: "Accueil", prefetch: undefined },
  { href: "/board", label: "Board", prefetch: false },
  { href: "/archives", label: "Archives", prefetch: false },
  { href: "/analytics", label: "Analytics", prefetch: false },
] as const;

export function Nav({ session }: { session: Session | null }) {
  const pathname = usePathname();
  const showExportImport = (EXPORT_IMPORT_PATHS as readonly string[]).includes(
    pathname
  );
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
    <header className="flex items-center gap-4 overflow-x-auto border-b border-border bg-white px-4 py-3">
      {/* overflow-x-auto (JOB-100) : le nombre d'items (wordmark + 5 liens +
          3 boutons d'action) dépasse 320px de large avant tout contenu de
          page — sans ceci, c'est le <header>, pas le contenu, qui forçait un
          scroll horizontal sur toute la page à cette largeur. */}
      <span className="mr-2 flex items-center gap-2 font-heading text-base font-bold text-heading">
        <span className="size-2 rounded-full bg-primary" />
        JobTracker
      </span>
      <nav className="flex flex-1 items-center gap-4">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            prefetch={link.prefetch}
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
      {showExportImport && (
        <>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="animate-spin" /> : <FileDown />}
            Exporter CSV
          </Button>
          <BackupControls />
        </>
      )}
      {session?.user && (
        <Link
          href="/account"
          prefetch={false}
          aria-label="Mon compte"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            pathname === "/account" && "text-primary"
          )}
        >
          <CircleUser />
        </Link>
      )}
      {session?.user && (
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" size="sm">
            <LogOut />
            Se déconnecter
          </Button>
        </form>
      )}
    </header>
  );
}
