import { cn } from "@/lib/utils"

interface ConnectorBadgeProps {
  label: string
  active: boolean
  meta?: string
  className?: string
}

// Pastille de statut de connecteur Harvester (JOB-92). La pulsation
// (motion-safe:animate-pulse, idiome Tailwind natif) est automatiquement
// désactivée par le navigateur si l'utilisateur a `prefers-reduced-motion:
// reduce` — remplacée par la pastille statique en couleur pleine, sans code
// supplémentaire. L'état actif/inactif est aussi porté par le texte
// ("Active"/"Inactive"), jamais uniquement par la couleur ou l'animation.
function ConnectorBadge({ label, active, meta, className }: ConnectorBadgeProps) {
  return (
    <span
      data-slot="connector-badge"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-pill-bg px-2.5 py-1 text-sm",
        className
      )}
    >
      <span
        data-testid="connector-dot"
        aria-hidden="true"
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          active ? "bg-brand-positive motion-safe:animate-pulse" : "bg-destructive"
        )}
      />
      <span className="font-medium">{label}</span>
      <span className="text-muted-foreground">{active ? "Active" : "Inactive"}</span>
      {meta ? (
        <span className="font-mono text-xs text-muted-foreground">{meta}</span>
      ) : null}
    </span>
  )
}

export { ConnectorBadge }
