import type { ReactNode } from "react";

interface HeroSectionProps {
  children: ReactNode;
}

/**
 * The mockup's hero background is a photograph; we don't have a licensed
 * asset to ship, so the backdrop is fully generated (gradients + SVG grain)
 * instead of a next/image photo. See JOB-38/JOB-51.
 */
export function HeroSection({ children }: HeroSectionProps) {
  return (
    <header className="relative isolate overflow-hidden bg-[#1c1728] px-4 py-16 sm:py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(120,63,142,0.55),transparent_55%),radial-gradient(circle_at_80%_0%,rgba(191,172,200,0.35),transparent_50%),linear-gradient(180deg,#1c1728_0%,#2e2440_45%,#4a4063_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      <div className="relative z-10 mx-auto flex max-w-xl flex-col items-center gap-6 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 font-mono text-xs uppercase tracking-widest text-[#bfacc8]">
          <span className="size-1.5 rounded-full bg-[#7bab8a]" />
          Local · zéro config · zéro cloud
        </span>
        <h1 className="font-heading text-xl text-white">
          Avant de repostuler, demandez d&apos;abord.
        </h1>
        <p className="max-w-md text-sm text-white/70">
          Collez l&apos;URL d&apos;une offre. On vérifie en local si vous
          l&apos;avez déjà vue — sinon, on l&apos;ajoute à votre board.
        </p>
        {children}
      </div>
    </header>
  );
}
