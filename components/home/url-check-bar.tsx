import { useRef, type FocusEvent, type KeyboardEvent } from "react";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type UrlCheckResultTag = {
  kind: "known" | "new";
  label: string;
};

interface UrlCheckBarProps {
  url: string;
  checking: boolean;
  error: string | null;
  resultTag: UrlCheckResultTag | null;
  onUrlChange: (value: string) => void;
  onBlur: () => void;
  onCheck: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}

export function UrlCheckBar({
  url,
  checking,
  error,
  resultTag,
  onUrlChange,
  onBlur,
  onCheck,
  onKeyDown,
}: UrlCheckBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // If focus is moving to the Vérifier button itself, don't run the
  // blur-triggered check: it would flip `checking` (and disable that very
  // button) mid-transition, stranding keyboard focus on nothing.
  function handleInputBlur(event: FocusEvent<HTMLInputElement>) {
    if (
      event.relatedTarget &&
      containerRef.current?.contains(event.relatedTarget as Node)
    ) {
      return;
    }
    onBlur();
  }

  return (
    <div
      ref={containerRef}
      className="w-full max-w-lg rounded-2xl border border-border bg-card p-2 shadow-card"
    >
      <div className="flex items-center gap-2">
        <Input
          autoFocus
          value={url}
          disabled={checking}
          placeholder="Colle l'URL de l'offre d'emploi ici..."
          onChange={(event) => onUrlChange(event.target.value)}
          onBlur={handleInputBlur}
          onKeyDown={onKeyDown}
          className="h-11"
        />
        <Button
          onClick={onCheck}
          disabled={checking || !url.trim()}
          className="h-11 shrink-0"
        >
          {checking ? <Loader2 className="animate-spin" /> : <Search />}
          Vérifier
        </Button>
      </div>
      <div aria-live="polite" className="min-h-6 px-1 pt-2">
        {error && (
          <p data-testid="url-check-error" className="text-sm text-palette-corail">
            {error}
          </p>
        )}
        {resultTag && (
          <span
            data-testid="url-check-tag"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-xs",
              resultTag.kind === "new"
                ? "bg-palette-mousse/20 text-brand-positive"
                : "bg-pill-bg text-muted-foreground"
            )}
          >
            {resultTag.label}
          </span>
        )}
      </div>
    </div>
  );
}
