"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const TABS = [
  { href: "/harvester", label: "Vue d'ensemble" },
  { href: "/harvester/campaigns", label: "Campagnes" },
  { href: "/harvester/review", label: "File de revue" },
] as const;

interface HarvesterTabsProps {
  reviewQueueCount?: number;
}

export function HarvesterTabs({ reviewQueueCount }: HarvesterTabsProps) {
  const pathname = usePathname();

  return (
    // overflow-x-auto (JOB-111, cf. nav.tsx JOB-100) : les 3 libellés + le
    // badge de compteur ne tiennent plus sur 360-390px. Un scroll horizontal
    // contenu à la nav (shrink-0 + whitespace-nowrap sur chaque onglet)
    // évite le retour à la ligne qui casserait le pattern d'onglets, plutôt
    // que de tronquer les libellés ou de laisser déborder toute la page.
    <nav className="flex gap-4 overflow-x-auto border-b border-border">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          prefetch={false}
          className={cn(
            "flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-2 text-sm font-medium transition-colors hover:text-heading",
            pathname === tab.href
              ? "border-primary font-bold text-heading"
              : "text-muted-foreground"
          )}
        >
          {tab.label}
          {tab.href === "/harvester/review" && !!reviewQueueCount && (
            <Badge variant="tag">{reviewQueueCount}</Badge>
          )}
        </Link>
      ))}
    </nav>
  );
}
