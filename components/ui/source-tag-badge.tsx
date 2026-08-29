import { Badge } from "@/components/ui/badge"

interface SourceTagBadgeProps extends Omit<React.ComponentProps<typeof Badge>, "variant" | "children"> {
  source: string
}

// Le texte de la source (ex. "France Travail") est une prop obligatoire, pas
// des children optionnels — aucun appelant ne peut construire un badge de
// source "icône seule" par erreur (JOB-92, a11y : la source doit toujours
// être vérifiable en toutes lettres, jamais un simple logo).
function SourceTagBadge({ source, ...props }: SourceTagBadgeProps) {
  return (
    <Badge variant="tag" {...props}>
      {source}
    </Badge>
  )
}

export { SourceTagBadge }
