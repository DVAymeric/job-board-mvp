"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { DiscoveredTarget } from "@prisma/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { approveDiscoveredTarget, rejectDiscoveredTarget } from "@/app/actions/discovery";

function formatTarget(target: unknown): string {
  if (typeof target === "string") return target;
  if (target && typeof target === "object" && "tenant" in target) {
    const t = target as { tenant: string; site: string; dc: string };
    return `${t.tenant} / ${t.site} (${t.dc})`;
  }
  return JSON.stringify(target);
}

export function DiscoveredTargetsManager({ initialTargets }: { initialTargets: DiscoveredTarget[] }) {
  const [targets, setTargets] = useState(initialTargets);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  function removeTarget(id: string) {
    setTargets((prev) => prev.filter((t) => t.id !== id));
  }

  function withPending<T>(id: string, fn: () => Promise<T>): Promise<T> {
    setPendingIds((prev) => new Set(prev).add(id));
    return fn().finally(() => {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    });
  }

  async function handleApprove(id: string) {
    const result = await withPending(id, () => approveDiscoveredTarget({ targetId: id }));
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    removeTarget(id);
    toast.success("Cible ajoutée à vos campagnes");
  }

  async function handleReject(id: string) {
    const result = await withPending(id, () => rejectDiscoveredTarget({ targetId: id }));
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    removeTarget(id);
  }

  if (targets.length === 0) {
    return (
      <div
        data-testid="discovered-targets-empty-state"
        className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border p-8 text-center"
      >
        <p className="font-heading text-lg text-heading">Aucune cible découverte</p>
        <p className="max-w-md text-base text-muted-foreground">
          Lancez une recherche manuelle depuis une campagne — de nouvelles cibles apparaîtront ici
          si des entreprises déjà vues publient aussi sur Workday, SmartRecruiters, Talentsoft ou
          DigitalRecruiters.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {targets.map((target) => {
        const pending = pendingIds.has(target.id);
        return (
          <li
            key={target.id}
            className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <span className="font-heading text-sm leading-snug text-heading">{target.companyName}</span>
              <span className="flex flex-wrap items-center gap-1.5">
                <Badge variant="tag">{target.platform}</Badge>
                <span className="font-mono text-xs text-muted-foreground">{formatTarget(target.target)}</span>
              </span>
            </div>
            <span className="flex gap-1.5">
              <Button size="sm" variant="accent" disabled={pending} onClick={() => handleApprove(target.id)}>
                {pending && <Loader2 className="animate-spin" />}
                Approuver
              </Button>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => handleReject(target.id)}>
                Rejeter
              </Button>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
