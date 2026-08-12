"use client";

import { usePathname } from "next/navigation";
import { Nav } from "@/components/nav";
import { MarketingNav } from "@/components/home/marketing-nav";

export function SiteHeader() {
  const pathname = usePathname();
  return pathname === "/" ? <MarketingNav /> : <Nav />;
}
