import type { Job, JobTag, Tag, Contact, StatusHistory } from "@prisma/client";

export type JobWithRelations = Job & {
  tags: (JobTag & { tag: Tag })[];
  contacts: Contact[];
  statusHistory: StatusHistory[];
};

/**
 * Codes d'erreur stables pour les échecs de Server Actions (JOB-59/JOB-89) :
 * catégorise la nature de l'échec indépendamment du message affiché (qui
 * peut varier par action), pour que les tests et le monitoring puissent
 * détecter un type d'erreur sans comparer des strings.
 */
export const ACTION_ERROR_CODES = [
  "UNAUTHENTICATED",
  "VALIDATION_ERROR",
  "RATE_LIMITED",
  "NOT_FOUND",
  "CONFLICT",
  "INTERNAL_ERROR",
  "FORBIDDEN",
] as const;

export type ActionErrorCode = (typeof ACTION_ERROR_CODES)[number];

/**
 * Résultat standard des Server Actions. `code` est optionnel : le contrat
 * existant n'est pas cassé (JOB-59) — tout code qui construit ou mocke déjà
 * `{ ok: false, error: string }` reste valide sans modification — mais
 * chaque Server Action réelle renseigne systématiquement `code` (JOB-89).
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: ActionErrorCode };
