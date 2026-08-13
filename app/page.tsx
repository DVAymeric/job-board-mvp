import HomeContent from "@/components/home/home-content";
import { BentoSection } from "@/components/home/bento-section";

export default function Home() {
  return (
    <div className="bg-white">
      <HomeContent />
      <section className="mx-auto w-full max-w-6xl px-4 py-12">
        <div className="mb-6 space-y-1">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Fonctionnalités
          </p>
          <h2 className="font-heading text-base text-heading">
            Tout votre suivi, en un board.
          </h2>
        </div>
        <BentoSection />
      </section>
    </div>
  );
}
