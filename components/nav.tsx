"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/board", label: "Board" },
  { href: "/archives", label: "Archives" },
] as const;

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="flex items-center gap-1 border-b border-border bg-card px-4 py-3">
      <span className="mr-4 font-heading text-base italic text-heading">
        Suivi de candidatures
      </span>
      <nav className="flex items-center gap-4">
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
    </header>
  );
}
