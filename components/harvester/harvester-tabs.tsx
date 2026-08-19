"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/harvester", label: "Vue d'ensemble" },
  { href: "/harvester/campaigns", label: "Campagnes" },
  { href: "/harvester/review", label: "File de revue" },
] as const;

export function HarvesterTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-4 border-b border-border">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          prefetch={false}
          className={cn(
            "border-b-2 border-transparent py-2 text-sm font-medium transition-colors hover:text-heading",
            pathname === tab.href ? "border-primary text-heading" : "text-muted-foreground"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
