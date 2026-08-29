"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { ChevronDown, CircleUser, LogOut, Menu, Moon, Sun, X } from "lucide-react";
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
  { href: "/recherche", label: "Recherche", prefetch: false },
  { href: "/analytics", label: "Analytics", prefetch: false },
  { href: "/harvester", label: "Harvester", prefetch: false },
] as const;

const noopSubscribe = () => () => {};

function useMounted() {
  // Garde anti-flash d'hydratation (JOB-119) : next-themes ne connaît le thème
  // persisté (localStorage) qu'après le montage côté client. useSyncExternalStore
  // avec un getServerSnapshot distinct évite un setState dans un effet (déconseillé,
  // cascading renders) tout en donnant `false` pendant le SSR et `true` une fois
  // hydraté, sans risque de désynchronisation.
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  const isDark = mounted && theme === "dark";
  const label = isDark ? "Passer en thème clair" : "Passer en thème sombre";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      disabled={!mounted}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}

const MOBILE_MENU_ID = "mobile-nav-menu";

function MobileMenu({
  open,
  onOpenChange,
  pathname,
  session,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pathname: string;
  session: Session | null;
}) {
  const close = () => onOpenChange(false);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/20 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup
          id={MOBILE_MENU_ID}
          className="fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col gap-4 rounded-l-2xl bg-popover p-4 text-popover-foreground shadow-panel outline-none data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right"
        >
          <div className="flex items-center justify-between">
            <DialogPrimitive.Title className="font-heading text-lg text-heading">
              Menu
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              render={<Button variant="ghost" size="icon" aria-label="Fermer le menu" />}
            >
              <X />
            </DialogPrimitive.Close>
          </div>
          <nav className="flex flex-col gap-1">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                prefetch={link.prefetch}
                onClick={close}
                className={cn(
                  "flex min-h-11 items-center rounded-lg px-2 text-base font-semibold transition-colors hover:bg-muted hover:text-heading",
                  pathname === link.href ? "text-heading" : "text-muted-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          {session?.user ? (
            <div className="flex flex-col gap-1 border-t border-border pt-4">
              <Link
                href="/account"
                prefetch={false}
                onClick={close}
                className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-base font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-heading"
              >
                <CircleUser />
                Mon compte
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-base font-semibold text-destructive transition-colors hover:bg-muted"
                >
                  <LogOut />
                  Se déconnecter
                </button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <Button
                variant="outline"
                onClick={close}
                render={<Link href="/login" prefetch={false} />}
              >
                Se connecter
              </Button>
              <Button onClick={close} render={<Link href="/register" prefetch={false} />}>
                Rejoindre la bêta
              </Button>
            </div>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function Nav({ session }: { session: Session | null }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="flex items-center gap-4 overflow-x-auto border-b border-border bg-white px-4 py-3">
      {/* overflow-x-auto (JOB-100) : le nombre d'items (wordmark + liens +
          menu compte) dépasse 320px de large avant tout contenu de page —
          sans ceci, c'est le <header>, pas le contenu, qui forçait un
          scroll horizontal sur toute la page à cette largeur. Les liens/CTA/
          compte desktop sont maintenant repliés sous md: (JOB-107), le menu
          mobile prend le relais en dessous. */}
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
      <nav className="hidden flex-1 items-center gap-4 md:flex">
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
      <div className="flex-1 md:hidden" />
      <ThemeToggle />
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Ouvrir le menu"
        aria-expanded={mobileMenuOpen}
        aria-controls={MOBILE_MENU_ID}
        onClick={() => setMobileMenuOpen(true)}
      >
        <Menu />
      </Button>
      <MobileMenu
        open={mobileMenuOpen}
        onOpenChange={setMobileMenuOpen}
        pathname={pathname}
        session={session}
      />
      {!session?.user && (
        <div className="hidden items-center gap-2 md:flex">
          <Button variant="outline" render={<Link href="/login" prefetch={false} />}>
            Se connecter
          </Button>
          <Button render={<Link href="/register" prefetch={false} />}>
            Rejoindre la bêta
          </Button>
        </div>
      )}
      {session?.user && (
        <div className="hidden md:block">
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
        </div>
      )}
    </header>
  );
}
