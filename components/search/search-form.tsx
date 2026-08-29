"use client";

import { useId, useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CAMPAIGN_CONTRACT_TYPES,
  CAMPAIGN_CONTRACT_TYPE_LABELS,
} from "@/lib/harvester/campaign-validation";

// JOB-98 avait initialement des options CDI/CDD/Alternance/Stage/Freelance
// hypothétiques, calquées sur le vocabulaire générique du mockup. JOB-104
// (branchement sur les vraies offres collectées) a révélé que le Harvester
// de ce produit ne collecte que des offres d'alternance/stage (enum Prisma
// OfferContractType) — ces options ne matchaient donc jamais aucune donnée
// réelle. Corrigé pour utiliser l'enum réel et ses libellés déjà définis.
const CONTRACT_TYPE_OPTIONS = CAMPAIGN_CONTRACT_TYPES.map((value) => ({
  value,
  label: CAMPAIGN_CONTRACT_TYPE_LABELS[value],
}));

export interface SearchCriteria {
  keyword: string;
  location: string;
  contractType: string;
}

export function SearchForm({
  onSearch,
}: {
  onSearch: (criteria: SearchCriteria) => void;
}) {
  const keywordId = useId();
  const locationId = useId();
  const contractTypeId = useId();

  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [contractType, setContractType] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch({ keyword, location, contractType });
  }

  return (
    // JOB-109 : sous `md:` (768px), les 3 champs et le bouton s'empilent en
    // pleine largeur (`flex-col`) pour rester utilisables sans zone de
    // saisie trop étroite ni défilement horizontal ; à partir de `md:` on
    // retrouve la disposition en ligne d'origine (`flex-row`, champs
    // `flex-1` avec `min-w-40`).
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end md:gap-2"
    >
      <div className="flex w-full flex-col gap-1.5 md:min-w-40 md:w-auto md:flex-1">
        <label htmlFor={keywordId} className="text-base font-medium">
          Métier, mot-clé
        </label>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id={keywordId}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Développeur, chargé de recrutement…"
            className="pl-8"
          />
        </div>
      </div>

      <div className="flex w-full flex-col gap-1.5 md:min-w-40 md:w-auto md:flex-1">
        <label htmlFor={locationId} className="text-base font-medium">
          Ville ou code postal
        </label>
        <Input
          id={locationId}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Reims, 51100…"
        />
      </div>

      <div className="flex w-full flex-col gap-1.5 md:min-w-40 md:w-auto md:flex-1">
        <label htmlFor={contractTypeId} className="text-base font-medium">
          Type de contrat
        </label>
        <Select
          value={contractType}
          onValueChange={(value) => setContractType(value ?? "")}
        >
          <SelectTrigger id={contractTypeId} className="w-full">
            <SelectValue placeholder="Tous types" />
          </SelectTrigger>
          <SelectContent>
            {CONTRACT_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="w-full md:w-auto">
        Rechercher
      </Button>
    </form>
  );
}
