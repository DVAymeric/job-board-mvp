import HomeContent from "@/components/home/home-content";
import { TrustRow } from "@/components/home/trust-row";
import { FeatureGrid } from "@/components/home/feature-grid";
import { BentoSection } from "@/components/home/bento-section";

// createJob programme l'enrichissement (scraping) via after() après sa
// réponse (JOB-ASYNC-ENRICH) — ce travail continue dans la même invocation
// serverless, bornée par maxDuration. Fetch Cheerio (5s) + repli Playwright
// (20s, lib/scraper/playwright-strategy.ts) peuvent additionner ~25s ; sans
// ce réglage explicite, la plateforme risque de couper l'enrichissement
// avant qu'il ait pu marquer la candidature DONE ou FAILED.
export const maxDuration = 45;

export default function Home() {
  return (
    <div className="bg-white">
      <HomeContent />
      <section className="mx-auto w-full max-w-6xl px-4 py-8">
        <TrustRow />
      </section>
      <section className="mx-auto w-full max-w-6xl px-4 py-12">
        <div className="mb-6 space-y-1">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Fonctionnalités
          </p>
          <h2 className="font-heading text-lg text-heading">
            Tout ce qu&apos;il vous faut pour ne rien perdre de vue
          </h2>
        </div>
        <FeatureGrid />
      </section>
      <section className="mx-auto w-full max-w-6xl px-4 py-12">
        <div className="mb-6 space-y-1">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Aperçu
          </p>
          <h2 className="font-heading text-lg text-heading">
            Tout votre suivi, en un board.
          </h2>
        </div>
        <BentoSection />
      </section>
    </div>
  );
}
