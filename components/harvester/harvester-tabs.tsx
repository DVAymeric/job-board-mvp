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
    <nav className="flex gap-4 border-b border-border">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          prefetch={false}
          className={cn(
            "flex h-11 items-center gap-1.5 border-b-2 border-transparent px-2 text-sm font-medium transition-colors hover:text-heading",
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
