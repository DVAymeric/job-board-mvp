import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div
      data-slot="bento-grid"
      className={cn(
        "grid grid-cols-2 gap-4 [grid-auto-rows:140px] md:grid-cols-4 md:[grid-auto-rows:150px]",
        className
      )}
    >
      {children}
    </div>
  );
}
