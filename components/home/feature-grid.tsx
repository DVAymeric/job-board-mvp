import { BellRing, LayoutGrid, RefreshCcw } from "lucide-react";

// Reprend telles quelles les 3 fonctionnalités du mockup (JOB-123).
const FEATURES = [
  {
    icon: LayoutGrid,
    title: "Toutes vos offres au même endroit",
    description: "Plus besoin de jongler entre dix onglets ouverts.",
  },
  {
    icon: RefreshCcw,
    title: "Un tableau simple pour suivre chaque étape",
    description: "Vous voyez d'un regard où en est chaque candidature.",
  },
  {
    icon: BellRing,
    title: "Un rappel avant chaque entretien",
    description: "Jamais plus une relance oubliée.",
  },
];

export function FeatureGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {FEATURES.map(({ icon: Icon, title, description }) => (
        <div
          key={title}
          className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-5"
        >
          <div className="flex size-10 items-center justify-center rounded-lg bg-pill-bg text-primary">
            <Icon className="size-5" aria-hidden="true" />
          </div>
          <h3 className="font-heading text-base text-heading">{title}</h3>
          <p className="text-base text-muted-foreground">{description}</p>
        </div>
      ))}
    </div>
  );
}
