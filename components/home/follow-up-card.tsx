import { BentoCard } from "@/components/home/bento-card";

interface FollowUpCardProps {
  summary: { count: number; oldestDays: number | null };
}

export function FollowUpCard({ summary }: FollowUpCardProps) {
  return (
    <BentoCard
      span="2x1"
      tone="default"
      label="Relance"
      title="Repérage automatique des candidatures sans réponse"
      className="border-transparent bg-[#c8c6d7]"
    >
      {summary.count > 0 ? (
        <span
          data-testid="follow-up-badge"
          className="inline-flex items-center gap-1.5 self-start rounded-full bg-[#4a4063] px-2.5 py-1 font-mono text-xs text-white"
        >
          Sans réponse depuis{" "}
          <strong className="text-[#f0c88a]">
            {summary.oldestDays} jour{summary.oldestDays !== 1 ? "s" : ""}
          </strong>{" "}
          · Postulé
          {summary.count > 1 &&
            ` (+${summary.count - 1} autre${summary.count - 1 > 1 ? "s" : ""})`}
        </span>
      ) : (
        <p data-testid="follow-up-empty" className="text-sm">
          Aucune relance en attente pour le moment.
        </p>
      )}
    </BentoCard>
  );
}
