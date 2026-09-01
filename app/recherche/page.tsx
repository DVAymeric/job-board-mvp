import { auth } from "@/auth";
import { BOARD_JOBS_SAFETY_LIMIT } from "@/lib/constants";
import { PageHeader } from "@/components/page-header";
import { OfferSearch } from "@/components/search/offer-search";
import type { SearchCriteria } from "@/components/search/search-form";
import { getSearchableOffers } from "@/lib/search/offers";

function firstParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

// JOB-139 : la hero de la homepage redirige ici avec les critères déjà
// saisis en query string (keyword/location/contractType) — repris tels
// quels pour que la recherche s'applique dès l'arrivée sur la page, plutôt
// que de faire retaper la même chose une seconde fois.
function criteriaFromSearchParams(searchParams: Record<string, string | string[] | undefined>): SearchCriteria {
  return {
    keyword: firstParam(searchParams.keyword),
    location: firstParam(searchParams.location),
    contractType: firstParam(searchParams.contractType),
  };
}

export default async function RecherchePage(props: PageProps<"/recherche">) {
  const searchParams = await props.searchParams;
  const initialCriteria = criteriaFromSearchParams(searchParams);

  const session = await auth();
  const userId = session?.user?.id;

  // JOB-138 : le Harvester reste un modèle par utilisateur (JOB-136) — un
  // visiteur non connecté n'a par construction aucune offre personnelle. On
  // ne lance même pas la requête (elle ne renverrait jamais rien) et on
  // affiche un message explicite avec une action claire (OfferSearch
  // signedOut) plutôt que la liste vide silencieuse d'avant ce ticket.
  if (!userId) {
    return (
      <div className="mx-auto w-full max-w-[1120px] space-y-4 p-4">
        <PageHeader
          eyebrow="Recherche"
          title="Recherche d'offres"
          subtitle="Parcourez les offres déjà trouvées pour vous par vos campagnes."
        />
        <OfferSearch offers={[]} signedOut initialCriteria={initialCriteria} />
      </div>
    );
  }

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
        subtitle="Parcourez les offres déjà trouvées pour vous par vos campagnes."
      />
      <OfferSearch
        offers={result.ok ? result.offers : []}
        loadError={result.ok ? undefined : result.error}
        initialCriteria={initialCriteria}
      />
    </div>
  );
}
