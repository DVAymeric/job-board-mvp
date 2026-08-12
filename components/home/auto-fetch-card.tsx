import { BentoCard } from "@/components/home/bento-card";
import { CompanyAvatar, type AvatarJob } from "@/components/board/company-avatar";

const PREVIEW_LIMIT = 3;

interface AutoFetchCardProps {
  jobs: AvatarJob[];
}

export function AutoFetchCard({ jobs }: AutoFetchCardProps) {
  const preview = jobs.slice(0, PREVIEW_LIMIT);

  return (
    <BentoCard label="Auto-fetch" title="Titre & logo">
      {preview.length > 0 ? (
        <div className="mt-auto flex items-center gap-2">
          {preview.map((job, index) => (
            <CompanyAvatar key={index} job={job} />
          ))}
        </div>
      ) : (
        <p data-testid="auto-fetch-empty" className="mt-auto">
          Ajoutez une offre pour voir la récupération automatique en action.
        </p>
      )}
    </BentoCard>
  );
}
