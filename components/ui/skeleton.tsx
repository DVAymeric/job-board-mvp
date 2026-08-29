import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

interface SkeletonProps extends ComponentProps<"div"> {
  shape?: "line" | "circle" | "rect"
}

// Placeholder de chargement générique (JOB-94). Purement décoratif
// (aria-hidden) : c'est au conteneur appelant de porter l'état accessible
// (ex. aria-busy + aria-label sur le wrapper, comme déjà fait dans JobCard)
// pour éviter des annonces dupliquées quand plusieurs Skeleton sont
// empilés dans une même région de chargement.
function Skeleton({ className, shape = "rect", ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        "motion-safe:animate-pulse bg-muted",
        shape === "circle" && "rounded-full",
        shape === "line" && "rounded",
        shape === "rect" && "rounded-lg",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
