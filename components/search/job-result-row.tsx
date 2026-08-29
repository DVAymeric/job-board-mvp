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

  return (
    <div className="flex items-center gap-4 border-b border-border p-3 transition-colors last:border-b-0 hover:bg-muted/50">
      <CompanyAvatar job={avatarJob} className="size-13 rounded-xl" />

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
          {result.tags.map((tag) => (
            <Badge key={tag} variant="tag">
              {tag}
            </Badge>
          ))}
          {result.beginnerFriendly && (
            <Badge variant="tag">Débutant accepté</Badge>
          )}
        </div>
      </div>

      <a
        href={result.applyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(buttonVariants({ variant: "accent" }), "shrink-0")}
      >
        Postuler
      </a>
    </div>
  );
}
