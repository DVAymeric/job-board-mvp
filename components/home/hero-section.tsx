import type { ReactNode } from "react";

interface HeroSectionProps {
  children: ReactNode;
}

export function HeroSection({ children }: HeroSectionProps) {
  return (
    <section className="relative isolate flex flex-col justify-center overflow-hidden bg-background px-4 py-16 sm:py-24">
      <div
        aria-hidden="true"
        data-testid="hero-glow"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(680px 340px at 88% -10%, var(--pill-bg) 0%, transparent 70%)",
        }}
      />
      <div className="relative z-10 flex w-full max-w-3xl flex-col items-start gap-6 text-left">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-pill-bg px-3 py-1 font-mono text-xs uppercase tracking-widest text-primary">
          <span className="size-1.5 rounded-full bg-palette-mousse" />
          100% gratuit · Sans configuration · Prêt en 2 minutes
        </span>
        <h1 className="font-heading text-2xl text-heading">
          Cherchez parmi les offres qu&apos;on{" "}
          <em className="text-primary italic">agrège pour vous</em>.
        </h1>
        <p className="max-w-md text-base text-muted-foreground">
          Métier, ville, type de contrat : lancez votre recherche, le
          Harvester rassemble les offres pendant que vous postulez.
        </p>
        {children}
      </div>
    </section>
  );
}
