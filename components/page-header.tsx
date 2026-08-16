import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  toolbar?: ReactNode;
};

/**
 * Titre de page en ligne 1, toolbar pleine largeur en ligne 2 (`flex-wrap` :
 * passe en colonne sur petit écran plutôt que de déborder) — partagé entre
 * Board et Analytics, les deux pages où l'export CSV est autorisé.
 */
export function PageHeader({ eyebrow, title, subtitle, toolbar }: PageHeaderProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        {eyebrow && (
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h1 className="font-heading text-xl text-heading">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {toolbar && (
        <div data-slot="page-header-toolbar" className="flex flex-wrap items-center gap-2">
          {toolbar}
        </div>
      )}
    </div>
  );
}
