"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, CircleUser, LogOut, Menu } from "lucide-react";
import type { Session } from "next-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/app/auth-actions";
import { cn } from "@/lib/utils";

// prefetch: false sur les routes protégées (JOB-131) — le prefetch par
// défaut de <Link> déclenche des GET en arrière-plan avec le cookie de
// session encore valide au moment de l'envoi ; si l'un d'eux arrive après un
// logout, le serveur le traite comme authentifié et réémet un cookie de
// session valide, ressuscitant la session juste effacée. "/" n'est pas
// protégée, aucun risque à la préfetcher.
const LINKS = [
  { href: "/", label: "Accueil", prefetch: undefined },
  { href: "/board", label: "Board", prefetch: false },
  { href: "/analytics", label: "Analytics", prefetch: false },
  { href: "/harvester", label: "Harvester", prefetch: false },
] as const;

export function Nav({ session }: { session: Session | null }) {
  const pathname = usePathname();

  return (
    <header className="flex items-center gap-4 overflow-x-auto border-b border-border bg-white px-4 py-3">
      {/* overflow-x-auto (JOB-100) : le nombre d'items (wordmark + liens +
          menu compte) dépasse 320px de large avant tout contenu de page —
          sans ceci, c'est le <header>, pas le contenu, qui forçait un
          scroll horizontal sur toute la page à cette largeur. */}
      <span className="mr-2 flex items-center gap-2 font-heading text-lg italic text-heading">
        <span className="size-2 rounded-full bg-primary" />
        JobTracker
        <Badge
          variant="tag"
          className="bg-brand-positive/10 text-brand-positive not-italic"
        >
          Bêta
        </Badge>
      </span>
      <nav className="flex flex-1 items-center gap-4">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            prefetch={link.prefetch}
            className={cn(
              "flex min-h-11 items-center border-b-2 border-transparent text-base font-semibold transition-colors hover:text-heading",
              pathname === link.href
                ? "border-primary text-heading"
                : "text-muted-foreground"
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Ouvrir le menu"
        disabled
        // TODO(JOB-107): ouverture du menu mobile — placeholder non fonctionnel pour l'instant.
      >
        <Menu />
      </Button>
      {!session?.user && (
        <div className="flex items-center gap-2">
          <Button variant="outline" render={<Link href="/login" prefetch={false} />}>
            Se connecter
          </Button>
          <Button render={<Link href="/register" prefetch={false} />}>
            Rejoindre la bêta
          </Button>
        </div>
      )}
      {session?.user && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="sm" className="gap-1.5">
                <CircleUser />
                Compte
                <ChevronDown className="size-3.5 opacity-60" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href="/account" prefetch={false} />}>
              <CircleUser />
              Mon compte
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <form action={logoutAction} className="contents">
              <DropdownMenuItem
                variant="destructive"
                nativeButton
                render={<button type="submit" />}
              >
                <LogOut />
                Se déconnecter
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  );
}
