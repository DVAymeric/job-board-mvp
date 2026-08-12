import type { ReactNode } from "react";

interface HeroSectionProps {
  children: ReactNode;
}

export function HeroSection({ children }: HeroSectionProps) {
  return (
    <section className="relative isolate flex min-h-dvh flex-col justify-center overflow-hidden bg-[#0a0712] px-4 py-16 sm:py-24">
      <div
        aria-hidden="true"
        data-testid="hero-bg-image"
        className="pointer-events-none absolute inset-0 scale-105 bg-cover bg-center blur-[6px] brightness-[0.55] saturate-[0.9]"
        style={{ backgroundImage: "url(/hero-bg.jpg)" }}
      />
      <div
        aria-hidden="true"
        data-testid="hero-scrim"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(100deg, rgba(10,7,18,0.92) 0%, rgba(10,7,18,0.72) 42%, rgba(20,14,34,0.35) 100%)",
        }}
      />
      <div className="relative z-10 flex w-full max-w-[640px] flex-col items-start gap-6 text-left">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 font-mono text-xs uppercase tracking-widest text-[#bfacc8]">
          <span className="size-1.5 rounded-full bg-[#7bab8a]" />
          Local · zéro config · zéro cloud
        </span>
        <h1 className="font-heading text-xl text-white">
          Ne repostulez plus{" "}
          <em className="text-[#c094d3] italic">deux fois</em> à la même
          offre.
        </h1>
        <p className="max-w-md text-sm text-white/70">
          Collez une URL, on vous dit instantanément si vous l&apos;avez déjà
          vue.
        </p>
        {children}
        <p className="font-mono text-xs text-white/50">
          0 dépendance cloud · SQLite local · Sans compte
        </p>
      </div>
    </section>
  );
}
