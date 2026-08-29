import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Dates en toutes lettres ("2 sept."), jamais en JJ/MM (a11y — principe du
// mockup de refonte, JOB-96). Réutilisable par les futurs restyles de pages
// (JOB-103/105/106) qui touchent encore des `toLocaleDateString("fr-FR")`
// au format JJ/MM ailleurs dans l'app.
export function formatDateFr(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(d)
}
