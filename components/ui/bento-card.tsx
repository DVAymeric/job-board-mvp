import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BentoSpan = "1x1" | "1x2" | "2x1" | "2x2" | "4x1";
export type BentoTone = "default" | "dark" | "accent" | "muted";

const SPAN_CLASSES: Record<BentoSpan, string> = {
  "1x1": "col-span-1 row-span-1",
  "2x1": "col-span-2 row-span-1",
  "1x2": "col-span-1 row-span-2",
  "2x2": "col-span-2 row-span-2",
  "4x1": "col-span-2 row-span-1 md:col-span-4",
};

// The `default`/`dark`/`accent` tones use theme-aware tokens (or colors
// dark enough to work unchanged in both themes). `muted` is a fixed light
// lilac surface that does NOT invert in dark mode, so its text must use
// fixed dark colors too — text-heading etc. would flip to a light color in
// .dark and become unreadable against this fixed light background.
const TONE_CLASSES: Record<BentoTone, string> = {
  default: "border border-border bg-card text-card-foreground",
  dark: "border border-transparent bg-gradient-to-br from-[#4a4063] to-[#2e2440] text-white",
  accent: "border border-transparent bg-[#783f8e] text-white",
  muted: "border border-transparent bg-[#c8c6d7]",
};

const TONE_LABEL_CLASSES: Record<BentoTone, string> = {
  default: "text-[#783f8e] dark:text-[#c094d3]",
  dark: "text-[#bfacc8]",
  accent: "text-white/65",
  muted: "text-[#4a4063]",
};

const TONE_TITLE_CLASSES: Record<BentoTone, string> = {
  default: "text-heading",
  dark: "text-white",
  accent: "text-white",
  muted: "text-[#4f1271]",
};

const TONE_BODY_CLASSES: Record<BentoTone, string> = {
  default: "text-muted-foreground",
  dark: "text-white/60",
  accent: "text-white/75",
  muted: "text-[#4a4063]",
};

interface BentoCardProps {
  span?: BentoSpan;
  tone?: BentoTone;
  label?: string;
  title?: string;
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function BentoCard({
  span = "1x1",
  tone = "default",
  label,
  title,
  children,
  className,
  bodyClassName,
}: BentoCardProps) {
  return (
    <div
      data-slot="bento-card"
      data-tone={tone}
      className={cn(
        "flex min-w-0 flex-col gap-2 overflow-hidden rounded-[20px] p-3 transition-transform duration-200 hover:-translate-y-0.5",
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
      {title && (
        <h3
          className={cn(
            "font-heading text-sm leading-snug",
            TONE_TITLE_CLASSES[tone]
          )}
        >
          {title}
        </h3>
      )}
      {children && (
        <div className={cn("min-w-0 text-sm", TONE_BODY_CLASSES[tone], bodyClassName)}>
          {children}
        </div>
      )}
    </div>
  );
}
