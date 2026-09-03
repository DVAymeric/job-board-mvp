"use client";

import { useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ChipInputProps {
  id?: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

function addValue(values: string[], raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return values;
  const isDuplicate = values.some((v) => v.toLowerCase() === trimmed.toLowerCase());
  if (isDuplicate) return values;
  return [...values, trimmed];
}

function addValues(values: string[], raw: string): string[] {
  return raw.split(/[,\n]+/).reduce(addValue, values);
}

// Pastilles + champ de saisie libre (JOB-147) — remplace un `Input` texte à
// valeurs séparées par virgules (ex. mots-clés de campagne), parsé
// uniquement au submit. Ici chaque valeur devient visible et retirable
// individuellement dès son ajout, sans attendre l'enregistrement du
// formulaire parent.
export function ChipInput({
  id,
  values,
  onChange,
  placeholder,
  disabled,
  className,
  ...ariaProps
}: ChipInputProps) {
  const [draft, setDraft] = useState("");

  function commitDraft() {
    const next = addValue(values, draft);
    if (next !== values) onChange(next);
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commitDraft();
      return;
    }
    if (event.key === "Backspace" && draft === "" && values.length > 0) {
      event.preventDefault();
      onChange(values.slice(0, -1));
    }
  }

  function handleBlur() {
    if (draft.trim()) commitDraft();
  }

  // Un collage d'une liste "Python, R, Scala" ne déclenche pas les `keydown`
  // virgule/Entrée gérés ci-dessus (le texte est inséré d'un bloc) : sans ce
  // handler, toute la liste collée devenait un unique mot-clé.
  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text");
    if (!/[,\n]/.test(text)) return;
    event.preventDefault();
    const next = addValues(values, draft + text);
    if (next !== values) onChange(next);
    setDraft("");
  }

  return (
    <div
      className={cn(
        "flex min-h-8 w-full flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent px-2.5 py-1 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        disabled && "pointer-events-none opacity-50",
        className
      )}
    >
      {values.map((value) => (
        <Badge key={value} variant="tag" className="gap-1">
          {value}
          <button
            type="button"
            onClick={() => onChange(values.filter((v) => v !== value))}
            aria-label={`Retirer ${value}`}
            className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <input
        id={id}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={handleBlur}
        placeholder={values.length === 0 ? placeholder : undefined}
        disabled={disabled}
        className="min-w-24 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-sm"
        {...ariaProps}
      />
    </div>
  );
}
