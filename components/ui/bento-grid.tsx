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
        // minmax(min, auto) plutôt qu'une hauteur de ligne fixe (JOB-110) :
        // une tuile 1x1 (Conversion, Mois actif) contient un label + une
        // valeur + une phrase de contexte, et sous ~850px la colonne devient
        // trop étroite pour que ça tienne sur 140/150px — avec une hauteur
        // figée et `overflow-hidden` sur BentoCard, le texte est alors
        // tronqué silencieusement (repro : /analytics à 375px et même à
        // 768px, juste sous le seuil où la 4e colonne desktop redonne de la
        // largeur). `minmax` garde la hauteur mosaïque cible tant que le
        // contenu tient, et ne grandit que si nécessaire — aucun changement
        // visuel là où ça tenait déjà (desktop large, cf. 1024px).
        "grid grid-cols-2 gap-4 [grid-auto-rows:minmax(140px,auto)] md:grid-cols-4 md:[grid-auto-rows:minmax(150px,auto)]",
        className
      )}
    >
      {children}
    </div>
  );
}
