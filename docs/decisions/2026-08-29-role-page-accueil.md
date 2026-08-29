# Décision produit — rôle de la page d'accueil (JOB-101)

**Date** : 2026-08-29
**Statut** : Tranché

## Contexte

Le mockup de refonte ("Interface Grand Public") propose pour `/` une landing marketing
classique : nav, hero (titre + sous-titre + 2 CTA), trust row (3 réassurances), feature-grid
3 colonnes. La page actuelle (`app/page.tsx`) sert de "vérificateur d'URL" : l'utilisateur
colle l'URL d'une offre externe, l'app détecte un doublon ou crée directement une
candidature à suivre (`components/home/url-check-bar.tsx`).

Contrairement à un SaaS multi-tenant classique, cette app n'a pas de séparation nette
pré-connexion / post-connexion : la nav (`components/nav.tsx`) expose Board/Analytics/
Harvester en permanence, ce qui indique un outil personnel plutôt qu'une landing publique
suivie d'une app séparée.

## Décision

1. **L'URL-check-bar reste sur `/`** et devient l'interaction principale du hero — c'est la
   vraie proposition de valeur du produit ("collez une offre, on s'occupe du suivi"), on ne
   la retire pas au profit d'un hero purement déclaratif.
2. Le hero adopte la nouvelle direction artistique (titre/sous-titre du mockup) mais les 2 CTA
   génériques du mockup ("Rejoindre la bêta" / "Voir comment ça marche") sont **remplacés**
   par l'URL-check-bar existante comme CTA principal — pas de duplication d'appel à l'action.
3. La trust row (3 réassurances : bêta gratuite, données non revendues, export en un clic)
   est ajoutée sous le hero, telle que dans le mockup.
4. Le feature-grid 3 colonnes du mockup **remplace** le contenu bento actuel
   (`components/home/bento-section.tsx`) plutôt que de coexister avec lui, pour éviter la
   redondance (les deux présentent globalement les mêmes fonctionnalités sous des formes
   différentes).

## Implémentation

Ce ticket est un ticket de cadrage — l'implémentation effective du nouveau layout `/`
(hero + url-check-bar + trust row + feature-grid) est faite dans JOB-102, qui doit suivre
exactement les points 1 à 4 ci-dessus.
