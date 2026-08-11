"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/board", label: "Board" },
] as const;

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="flex items-center gap-1 border-b border-border px-4 py-3">
      <span className="mr-3 text-sm font-semibold">Suivi de candidatures</span>
      <nav className="flex items-center gap-1">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-muted",
              pathname === link.href
                ? "bg-muted text-foreground"
                : "text-muted-foreground"
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
