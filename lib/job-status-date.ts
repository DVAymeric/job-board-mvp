/**
 * Date à laquelle une candidature a atteint son statut ACTUEL — pas sa date
 * de création (JOB-124, mockup : "Envoyée le 12/08", "Entretien le 2 sept."
 * affichés à côté du badge de statut, jamais la date d'ajout).
 *
 * Dérivée de `statusHistory` : la plus récente entrée dont le statut
 * correspond au statut courant du job (un job peut repasser plusieurs fois
 * par le même statut — ex. réinterrogé après un premier entretien annulé —
 * seule la transition la plus récente compte). `null` si l'historique ne
 * contient aucune entrée pour ce statut (données créées avant l'existence
 * de `statusHistory`, ou incohérence de données).
 */
export function getCurrentStatusDate(job: {
  status: string;
  statusHistory: { status: string; changedAt: Date }[];
}): Date | null {
  const matching = job.statusHistory.filter((h) => h.status === job.status);
  if (matching.length === 0) return null;

  return matching.reduce((latest, entry) =>
    new Date(entry.changedAt) > new Date(latest.changedAt) ? entry : latest
  ).changedAt;
}
