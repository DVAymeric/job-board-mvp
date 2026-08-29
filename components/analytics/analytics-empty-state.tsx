import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * État vide de la page Analytics (JOB-115) : tant qu'aucune candidature
 * n'a été suivie, le funnel et la heatmap n'ont aucune donnée à afficher
 * et rendraient un graphique vide/cassé. On invite plutôt l'utilisateur à
 * ajouter sa première candidature, avec un lien vers l'accueil (là où se
 * fait l'ajout, cf. JOB-103) plutôt que de laisser des panneaux à 0.
 */
export function AnalyticsEmptyState() {
  return (
    <div
      data-testid="analytics-empty-state"
      className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-10 text-center"
    >
      <p className="flex items-center gap-2 font-heading text-lg text-heading">
        <Sparkles aria-hidden="true" className="size-5 text-palette-orchidee" />
        Vos statistiques arriveront ici
      </p>
      <p className="max-w-md text-base text-muted-foreground">
        Ajoutez votre première candidature pour commencer à suivre votre
        funnel de conversion et votre régularité au fil des mois.
      </p>
      <Button size="lg" render={<Link href="/" prefetch={false} />} nativeButton={false}>
        <Plus aria-hidden="true" />
        Ajouter une candidature
      </Button>
    </div>
  );
}
