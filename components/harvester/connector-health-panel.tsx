"use client";

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import type { ConnectorRun } from "@prisma/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConnectorHealthList } from "@/components/harvester/connector-health-list";
import { getConnectorsHealth } from "@/app/actions/harvest";
import type { ConnectorHealth } from "@/lib/harvester/timed-health-check";

// JOB-59 : le check "live" (healthCheck() en direct sur les 9 connecteurs) n'est déclenché
// qu'à la demande — pas au chargement de la page — pour éviter de frapper 9 API tierces à
// chaque visite de /harvester/review (même logique manuelle que "Lancer la collecte").
export function ConnectorHealthPanel({ runs }: { runs: ConnectorRun[] }) {
  const [live, setLive] = useState<Record<string, ConnectorHealth> | undefined>(undefined);
  const [checking, setChecking] = useState(false);

  async function handleCheck() {
    setChecking(true);
    const result = await getConnectorsHealth();
    setChecking(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setLive(Object.fromEntries(result.data.health.map((health) => [health.connectorId, health])));
  }

  return (
    <div className="space-y-1.5">
      <Button size="sm" variant="outline" disabled={checking} onClick={handleCheck}>
        {checking ? <Loader2 className="animate-spin" /> : <RefreshCw className="size-3.5" />}
        Vérifier maintenant
      </Button>
      <ConnectorHealthList runs={runs} live={live} />
    </div>
  );
}
