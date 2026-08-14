"use client";

import { useEffect } from "react";

const POLL_INTERVAL_MS = 3000;

/**
 * Tant qu'au moins une candidature visible est en cours d'enrichissement
 * (`enrichmentStatus: "PENDING"`), rafraîchit périodiquement le board pour
 * que le titre/l'entreprise apparaissent dès que l'enrichissement en tâche
 * de fond (JOB-ASYNC-ENRICH) se termine. Un rechargement complet plutôt que
 * `router.refresh()` : ce dernier peut resservir une réponse mise en cache
 * (même `_rsc`) au lieu de re-fetcher le Server Component, alors qu'une
 * navigation complète reflète toujours l'état serveur à jour — vérifié
 * empiriquement contre cette version de Next.js. Pas de websocket : un
 * rechargement toutes les 3s tant qu'un enrichissement est en attente
 * (généralement résolu en 1 à 2s) reste léger. S'arrête de lui-même dès
 * qu'il n'y a plus de candidature en attente.
 */
export function EnrichmentPollWatcher({
  hasPendingEnrichment,
}: {
  hasPendingEnrichment: boolean;
}) {
  useEffect(() => {
    if (!hasPendingEnrichment) return;
    const interval = setInterval(() => window.location.reload(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [hasPendingEnrichment]);

  return null;
}
