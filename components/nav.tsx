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
    <header className="flex items-center gap-1 border-b border-border bg-card px-4 py-3">
      <span className="mr-3 text-sm font-semibold text-heading">
        Suivi de candidatures
      </span>
      <nav className="flex items-center gap-1">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
              pathname === link.href
                ? "bg-accent text-accent-foreground"
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
