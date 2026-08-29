import { auth } from "@/auth";
import { BOARD_JOBS_SAFETY_LIMIT } from "@/lib/constants";
import { PageHeader } from "@/components/page-header";
import { OfferSearch } from "@/components/search/offer-search";
import { getSearchableOffers } from "@/lib/search/offers";

export default async function RecherchePage() {
  const session = await auth();
  const userId = session?.user?.id ?? "";

  // Le chargement peut échouer (base indisponible, etc.) : getSearchableOffers
  // ne throw jamais, il renvoie un message clair (JOB-116) — le formulaire de
  // recherche reste affiché et utilisable même dans ce cas, plutôt que de
  // laisser Next.js remplacer toute la page par son écran d'erreur générique.
  const result = await getSearchableOffers(userId, BOARD_JOBS_SAFETY_LIMIT);

  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-4 p-4">
      <PageHeader
        eyebrow="Recherche"
        title="Recherche d'offres"
        subtitle="Parcourez les offres déjà collectées pour vous par le Harvester."
      />
      <OfferSearch
        offers={result.ok ? result.offers : []}
        loadError={result.ok ? undefined : result.error}
      />
    </div>
  );
}
