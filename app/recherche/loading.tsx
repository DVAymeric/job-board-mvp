import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

// JOB-117 : /recherche est un Server Component qui charge tout côté serveur
// (getSearchableOffers, cf. page.tsx) — il n'y a pas d'état de chargement
// React interne à couvrir. Le pattern App Router adapté est ce loading.tsx :
// Next.js l'affiche instantanément à la navigation vers cette route, pendant
// que le payload RSC (avec les offres) continue de streamer.
//
// Le titre/sous-titre viennent du vrai PageHeader (texte statique, jamais
// chargé de façon async) pour qu'aucune ligne de texte ne bouge une fois les
// données arrivées ; seules les zones réellement dépendantes des données
// (champs du formulaire, lignes de résultats) sont en Skeleton, avec les
// mêmes dimensions que SearchForm/JobResultRow pour éviter tout CLS.
export const RECHERCHE_SKELETON_ROW_COUNT = 6;

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-4 p-4">
      <PageHeader
        eyebrow="Recherche"
        title="Recherche d'offres"
        subtitle="Parcourez les offres déjà trouvées pour vous par vos campagnes."
      />
      <div aria-busy="true" aria-label="Chargement des offres" className="space-y-4">
        {/* Squelette du SearchForm : mêmes classes de disposition
            (flex-col -> md:flex-row) que components/search/search-form.tsx. */}
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end md:gap-2">
          <div className="flex w-full flex-col gap-1.5 md:min-w-40 md:w-auto md:flex-1">
            <Skeleton shape="line" className="h-4 w-28" />
            <Skeleton shape="rect" className="h-11 w-full" />
          </div>
          <div className="flex w-full flex-col gap-1.5 md:min-w-40 md:w-auto md:flex-1">
            <Skeleton shape="line" className="h-4 w-36" />
            <Skeleton shape="rect" className="h-11 w-full" />
          </div>
          <div className="flex w-full flex-col gap-1.5 md:min-w-40 md:w-auto md:flex-1">
            <Skeleton shape="line" className="h-4 w-28" />
            <Skeleton shape="rect" className="h-11 w-full" />
          </div>
          <Skeleton shape="rect" className="h-11 w-full md:w-32" />
        </div>

        {/* Squelette des lignes JobResultRow : même conteneur
            divide-y/rounded-xl/border que OfferSearch, avatar size-13
            rounded-xl identique à CompanyAvatar. */}
        <div className="divide-y divide-border rounded-xl border border-border">
          {Array.from({ length: RECHERCHE_SKELETON_ROW_COUNT }).map((_, index) => (
            <div
              key={index}
              className="flex flex-col gap-3 p-3 md:flex-row md:items-center md:gap-4"
            >
              <div className="flex min-w-0 flex-1 items-start gap-4">
                <Skeleton shape="rect" className="size-13 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton shape="line" className="h-4 w-3/4 max-w-xs" />
                  <Skeleton shape="line" className="h-3.5 w-1/2 max-w-56" />
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Skeleton shape="rect" className="h-5 w-16 rounded-full" />
                    <Skeleton shape="rect" className="h-5 w-20 rounded-full" />
                  </div>
                </div>
              </div>
              <Skeleton shape="rect" className="h-11 w-full md:w-28" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
