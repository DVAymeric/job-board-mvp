# Devenir de "Cibles découvertes" pour la navigation grand public (JOB-153)

**Date** : 2026-09-01
**Statut** : Tranché

## Contexte

L'onglet "Cibles découvertes" (`/harvester/discovery`, `DiscoveredTargetsManager`) sonde
automatiquement Workday, SmartRecruiters, Talentsoft et DigitalRecruiters pour des entreprises
déjà vues dans les offres collectées, et demande d'"Approuver" ou "Rejeter" chaque cible trouvée
(affichée littéralement comme `tenant / site (dc)`). Ce n'est pas un problème de vocabulaire
(traité séparément, JOB-149) : c'est un mécanisme de configuration des sources de données que
personne dans le grand public ne doit avoir à administrer.

## Décision

* L'onglet disparaît de `HarvesterTabs` — plus aucune entrée de navigation n'y mène pour un
  utilisateur grand public.
* La revue manuelle (Approuver/Rejeter) est **conservée telle quelle**, pas d'auto-approbation.
  Basculer en auto-approbation changerait le comportement des campagnes existantes (nouvelles
  cibles ajoutées sans consentement) pour un risque et une surface de test qui dépassent le
  périmètre de ce ticket ; ce n'est pas non plus réversible sans trace claire de ce qui a été
  ajouté automatiquement.
* La route `/harvester/discovery` reste pleinement fonctionnelle et accessible par lien direct —
  aucune redirection, aucun message de route cassée, rien à migrer.
* Aucune zone admin dédiée n'est créée dans ce ticket : la fonctionnalité reste au même endroit
  technique, simplement retirée de la nav visible. Une zone admin distincte reste une option pour
  plus tard si le besoin de supervision (au-delà d'un lien direct) se confirme.

## Portée du changement

* `components/harvester/harvester-tabs.tsx` : retrait de l'onglet et de son badge de compteur.
* `app/harvester/page.tsx`, `app/harvester/campaigns/page.tsx`, `app/harvester/review/page.tsx`,
  `app/harvester/discovery/page.tsx` : retrait du calcul et du câblage de `discoveredTargetCount`,
  devenu inutile une fois l'onglet retiré.
* `lib/harvester/pending-discovered-target-count.ts` supprimé (plus aucun appelant après ce
  retrait) — code mort plutôt que laissé en place "au cas où".
* `components/harvester/discovered-targets-manager.tsx` (la page elle-même) : **inchangé**.
