import { CalendarClock, CircleDashed, Send, XCircle } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { STATUS, STATUS_CONFIG, type JobStatus } from "@/lib/constants"

// Icône dédiée par statut (forme distincte, pas seulement une couleur — a11y
// daltonisme, JOB-91). Le vert "answer/positif" du mockup n'a pas d'équivalent
// dans le modèle de données actuel (TO_APPLY/APPLIED/INTERVIEW/REJECTED,
// cf. lib/constants.ts) : REJECTED reste sur son propre token --status-rejected-*
// (JOB-89), jamais sur --status-answer-* qui afficherait un refus en vert positif.
const STATUS_ICONS: Record<JobStatus, LucideIcon> = {
  [STATUS.TO_APPLY]: CircleDashed,
  [STATUS.APPLIED]: Send,
  [STATUS.INTERVIEW]: CalendarClock,
  [STATUS.REJECTED]: XCircle,
}

const STATUS_BADGE_CLASSNAME: Record<JobStatus, string> = {
  [STATUS.TO_APPLY]: "bg-status-todo-bg text-status-todo-fg",
  [STATUS.APPLIED]: "bg-status-sent-bg text-status-sent-fg",
  [STATUS.INTERVIEW]: "bg-status-interview-bg text-status-interview-fg",
  [STATUS.REJECTED]: "bg-status-rejected-bg text-status-rejected-fg",
}

interface StatusBadgeProps extends React.ComponentProps<typeof Badge> {
  status: JobStatus
}

function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  const Icon = STATUS_ICONS[status]
  const label = STATUS_CONFIG[status].label

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 border-transparent text-sm font-bold",
        STATUS_BADGE_CLASSNAME[status],
        className
      )}
      {...props}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {label}
    </Badge>
  )
}

export { StatusBadge, STATUS_ICONS, STATUS_BADGE_CLASSNAME }
