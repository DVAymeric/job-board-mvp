# Vocabulaire grand public pour la section Harvester (JOB-149, JOB-150)

**Date** : 2026-08-31
**Statut** : Tranché

## Contexte

La section Harvester (automatisation de recherche d'offres) exposait jusqu'ici son vocabulaire
technique interne directement à l'utilisateur : "Harvester", "Campagne", "Collecte", "Importer",
"Ignorer", "File de revue". Ce vocabulaire reflète l'implémentation (connecteurs, jobs de
collecte, file de revue humaine) mais n'est pas celui d'un public non technique, qui utilise
cette fonctionnalité pour suivre des offres d'emploi, pas pour administrer un pipeline de
collecte de données.

Cette branche a remplacé ce vocabulaire par des termes grand public dans toute la section
Harvester (nav, titres de page, libellés de bouton, messages d'état, toasts) ainsi que dans
`/recherche`, qui référence la section Harvester sans en faire partie.

## Lexique validé

| Ancien terme | Nouveau terme |
|---|---|
| Harvester (nav, titres de page) | Alertes emploi (nav : "Alertes") |
| Campagne(s) | Alerte(s) |
| Lancer la collecte | Chercher des offres |
| File de revue | Nouvelles offres |
| Importer / "vers le board" | Ajouter à mon suivi |
| Ignorer (action sur une offre) | Passer |
| Collecte (mot générique : "offres collectées", "Collecte automatisée") | recherche / trouvée(s) |

## Portée : uniquement le texte affiché

Les identifiants techniques — routes (`/harvester/*`), noms de Server Actions
(`importHarvestedOffer`, `ignoreHarvestedOffer`, etc.), champs Prisma (`HarvestedOffer`,
`campaignId`, etc.), noms de fichiers et de composants — ont été laissés inchangés
volontairement. Renommer ces identifiants aurait élargi le risque de régression bien au-delà de
ce que demandait le changement (un renommage purement visuel) sans bénéfice pour
l'utilisateur, qui ne les voit jamais.
