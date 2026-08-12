import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BentoSpan = "1x1" | "1x2" | "2x1" | "2x2";
export type BentoTone = "default" | "dark" | "accent";

const SPAN_CLASSES: Record<BentoSpan, string> = {
  "1x1": "col-span-1 row-span-1",
  "2x1": "col-span-2 row-span-1",
  "1x2": "col-span-1 row-span-2",
  "2x2": "col-span-2 row-span-2",
};

const TONE_CLASSES: Record<BentoTone, string> = {
  default: "border border-border bg-card text-card-foreground",
  dark: "border border-transparent bg-gradient-to-br from-[#4a4063] to-[#2e2440] text-white",
  accent: "border border-transparent bg-[#783f8e] text-white",
};

const TONE_LABEL_CLASSES: Record<BentoTone, string> = {
  default: "text-[#783f8e] dark:text-[#c094d3]",
  dark: "text-[#bfacc8]",
  accent: "text-white/65",
};

const TONE_TITLE_CLASSES: Record<BentoTone, string> = {
  default: "text-heading",
  dark: "text-white",
  accent: "text-white",
};

const TONE_BODY_CLASSES: Record<BentoTone, string> = {
  default: "text-muted-foreground",
  dark: "text-white/60",
  accent: "text-white/75",
};

interface BentoCardProps {
  span?: BentoSpan;
  tone?: BentoTone;
  label?: string;
  title: string;
  children?: ReactNode;
  className?: string;
}

export function BentoCard({
  span = "1x1",
  tone = "default",
  label,
  title,
  children,
  className,
}: BentoCardProps) {
  return (
    <div
      data-slot="bento-card"
      data-tone={tone}
      className={cn(
        "flex flex-col gap-2 overflow-hidden rounded-[20px] p-3 transition-transform duration-200 hover:-translate-y-0.5",
        SPAN_CLASSES[span],
        TONE_CLASSES[tone],
        className
      )}
    >
      {label && (
        <span
          className={cn(
            "font-mono text-xs uppercase tracking-widest",
            TONE_LABEL_CLASSES[tone]
          )}
        >
          {label}
        </span>
      )}
      <h3
        className={cn(
          "font-heading text-sm leading-snug",
          TONE_TITLE_CLASSES[tone]
        )}
      >
        {title}
      </h3>
      {children && (
        <div className={cn("text-sm", TONE_BODY_CLASSES[tone])}>
          {children}
        </div>
      )}
    </div>
  );
}
