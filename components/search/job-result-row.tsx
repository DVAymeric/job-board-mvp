import { CompanyAvatar } from "@/components/board/company-avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn, formatDateFr } from "@/lib/utils";

export interface JobResult {
  id: string;
  title: string;
  companyName: string;
  companyLogoUrl: string | null;
  location: string;
  publishedAt: Date;
  contractType: string;
  tags: string[];
  beginnerFriendly: boolean;
  applyUrl: string;
}

export function JobResultRow({ result }: { result: JobResult }) {
  const avatarJob = {
    companyLogoUrl: result.companyLogoUrl,
    companyName: result.companyName,
    title: result.title,
    url: result.applyUrl,
  };

  // JOB-145 : audit accessibilité grand public — garder l'essentiel affiché
  // par défaut (contrat + 1 tag maximum) pour ne pas surcharger visuellement
  // une carte d'offre, plutôt que d'empiler tous les badges disponibles.
  const secondaryTags = [
    ...result.tags,
    ...(result.beginnerFriendly ? ["Débutant accepté"] : []),
  ];
  const visibleSecondaryTags = secondaryTags.slice(0, 1);
  const hiddenSecondaryTags = secondaryTags.slice(1);

  return (
    // JOB-109 : sous `md:` (768px), le logo/titre/meta/tags restent groupés
    // dans le bloc du haut (déjà lisible sur ~360-390px : avatar `size-13`
    // fixe + colonne de texte qui enveloppe), et le CTA « Postuler » passe
    // en pleine largeur sous ce bloc plutôt que serré à droite. À partir de
    // `md:` on retrouve la ligne unique d'origine (`md:flex-row`, CTA
    // `md:w-auto` aligné à droite).
    <div className="flex flex-col gap-3 border-b border-border p-3 transition-colors last:border-b-0 hover:bg-muted/50 md:flex-row md:items-center md:gap-4">
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <CompanyAvatar job={avatarJob} className="size-13 shrink-0 rounded-xl" />

        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="font-heading text-base leading-snug text-heading">
            {result.title}
          </p>
          <p className="text-sm text-muted-foreground">
            {result.companyName} · {result.location} · Publiée{" "}
            {formatDateFr(result.publishedAt)}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="tag">{result.contractType}</Badge>
            {visibleSecondaryTags.map((tag) => (
              <Badge key={tag} variant="tag">
                {tag}
              </Badge>
            ))}
            {hiddenSecondaryTags.length > 0 && (
              <Badge
                variant="tag"
                aria-label={`Et ${hiddenSecondaryTags.length} de plus : ${hiddenSecondaryTags.join(", ")}`}
              >
                +{hiddenSecondaryTags.length}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <a
        href={result.applyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(buttonVariants({ variant: "accent" }), "w-full shrink-0 md:w-auto")}
      >
        Postuler
      </a>
    </div>
  );
}
