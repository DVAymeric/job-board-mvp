import Link from "next/link";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-1.5">
      <h2 className="font-heading text-base text-heading">{title}</h2>
      <div className="space-y-1.5 text-sm text-muted-foreground">{children}</div>
    </section>
  );
}

export default function ConfidentialitePage() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 p-4">
      <h1 className="font-heading text-xl text-heading">Confidentialité</h1>
      <p className="text-sm text-muted-foreground">
        Dernière mise à jour : 14 août 2026. Ce document résume, de façon
        simple, quelles données personnelles cette application traite,
        pourquoi, et comment les supprimer.
      </p>

      <Section title="Quelles données sont collectées">
        <p>
          Compte : adresse e-mail et mot de passe (stocké sous forme hachée,
          jamais en clair).
        </p>
        <p>
          Candidatures : URL de l&apos;offre, titre, entreprise, statut,
          notes, salaire, dates d&apos;entretien, liens vers ton CV et ta
          lettre de motivation si tu les renseignes (ces liens sont stockés
          tels quels — les fichiers eux-mêmes ne sont jamais uploadés sur
          nos serveurs), contacts et tags associés.
        </p>
      </Section>

      <Section title="Pourquoi (finalité et base légale)">
        <p>
          Ces données sont utilisées uniquement pour fournir le service
          demandé : suivre tes candidatures d&apos;emploi. Base légale :
          exécution du contrat qui te lie à l&apos;application dès la
          création de ton compte. Aucune donnée n&apos;est vendue ni
          partagée à des fins publicitaires.
        </p>
      </Section>

      <Section title="Qui d'autre reçoit des données">
        <p>
          Récupération du logo d&apos;entreprise : le nom de domaine de
          l&apos;offre (jamais ton e-mail ni le contenu de la candidature)
          est envoyé à Clearbit, puis à Brandfetch en repli si besoin.
        </p>
        <p>
          Récupération automatique du titre de l&apos;offre : l&apos;URL que
          tu colles est visitée pour en extraire le titre et l&apos;entreprise
          — ne colle pas une URL contenant un identifiant de session
          personnel dans les paramètres si tu préfères l&apos;éviter.
        </p>
        <p>
          Si le monitoring d&apos;erreurs (Sentry) est activé, le message
          technique d&apos;une erreur applicative peut lui être transmis,
          associé à ton identifiant de compte, pour diagnostiquer un bug.
        </p>
      </Section>

      <Section title="Durée de conservation">
        <p>
          Tes données sont conservées tant que ton compte existe. Aucune
          purge automatique par ailleurs.
        </p>
      </Section>

      <Section title="Comment les supprimer">
        <p>
          Depuis{" "}
          <Link href="/account" className="text-primary underline underline-offset-2">
            Mon compte
          </Link>
          , le bouton « Supprimer mon compte » efface immédiatement et
          définitivement ton compte ainsi que toutes tes candidatures,
          contacts et tags associés. Cette action ne peut pas être annulée.
        </p>
      </Section>
    </div>
  );
}
