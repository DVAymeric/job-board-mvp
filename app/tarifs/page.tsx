import Link from "next/link";
import { BentoGrid } from "@/components/ui/bento-grid";
import { BentoCard } from "@/components/ui/bento-card";
import { Button } from "@/components/ui/button";

const FEATURES = [
  "Suivi illimité de candidatures",
  "Détection automatique et récupération du titre depuis l'URL",
  "Board Kanban, analytics",
  "Tags, contacts et notes par candidature",
  "Export CSV",
];

export default function TarifsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 p-4">
      <div className="space-y-1">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Tarification
        </p>
        <h1 className="font-heading text-xl text-heading">Tarifs</h1>
        <p className="text-sm text-muted-foreground">
          Un seul palier aujourd&apos;hui, gratuit — sans carte bancaire.
        </p>
      </div>

      {/* BentoGrid/BentoCard existants, pas de layout de pricing dédié
          (JOB-127) — un futur palier payant s'ajoute comme une carte de
          plus dans cette même grille, sans refonte. */}
      <BentoGrid>
        <BentoCard span="2x2" tone="accent" label="Palier actuel" title="Gratuit">
          <div className="flex h-full flex-col gap-3">
            <p className="font-heading text-2xl text-white">
              0&nbsp;€{" "}
              <span className="text-sm font-normal text-white/70">
                / toujours
              </span>
            </p>
            <ul className="list-disc space-y-1 pl-4 text-sm text-white/75">
              {FEATURES.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <Button
              render={<Link href="/register" />}
              nativeButton={false}
              className="mt-auto self-start"
            >
              Créer un compte gratuit
            </Button>
          </div>
        </BentoCard>
      </BentoGrid>
    </div>
  );
}
