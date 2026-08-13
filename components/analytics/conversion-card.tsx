import { BentoCard } from "@/components/home/bento-card";

interface ConversionCardProps {
  rate: number | null;
  appliedCount: number;
  interviewCount: number;
}

export function ConversionCard({
  rate,
  appliedCount,
  interviewCount,
}: ConversionCardProps) {
  return (
    <BentoCard tone="default" label="Conversion clé" title="Postulé → Entretien">
      <div className="flex flex-1 flex-col justify-between gap-2">
        <p className="font-heading text-4xl font-medium text-[#783f8e] italic">
          {rate === null ? "—" : `${rate}%`}
        </p>
        <p>
          {appliedCount === 0
            ? "Aucune candidature postulée pour l'instant."
            : `${interviewCount} candidature${interviewCount > 1 ? "s" : ""} sur ${appliedCount} postulée${appliedCount > 1 ? "s" : ""} obtient un entretien.`}
        </p>
      </div>
    </BentoCard>
  );
}
