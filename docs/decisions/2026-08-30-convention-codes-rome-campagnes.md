# Convention codes ROME pour les campagnes de collecte (JOB-71)

**Date** : 2026-08-30
**Statut** : Tranché

## Contexte

Le post-filtre centralisé (JOB-73) et l'audit des connecteurs (JOB-74) ont mis en lumière un
risque structurel : un code ROME est une catégorie de métier assez large (ex. M1805, "Études et
développement informatique") pour capter des offres pertinentes pour plusieurs campagnes à la
fois. Si deux campagnes actives partagent le même code ROME sans mots-clés suffisamment
distincts, chacune récupère des offres qui devraient appartenir à l'autre — une source de bruit
silencieux dans les résultats, sans erreur ni log pour la signaler.

Le ticket JOB-67 avait déjà identifié un cas concret : `alternance-data-hdf` et
`alternance-devweb-hdf` partagent toutes deux le code `M1805`.

## Audit réalisé (2026-08-30)

Seule source de configuration de campagnes versionnée dans ce repo :
`lib/harvester/__fixtures__/campaigns.yaml` (vérifié : aucun autre fichier YAML/YML dans le
repo ne contient de `romeCodes`, aucun script de seed Prisma n'en définit non plus). Elle
contient exactement deux campagnes :

| Campagne | Codes ROME |
|---|---|
| `alternance-data-hdf` | M1403, **M1805** |
| `alternance-devweb-hdf` | M1802, **M1805**, M1811 |

Chevauchement trouvé : **uniquement M1805**, déjà connu. Aucun autre chevauchement possible
avec seulement deux campagnes et cinq codes ROME au total, dont un seul partagé. La correction
de ce cas précis (séparation des codes ROME partagés) est traitée dans JOB-67, pas ici.

## Décision — convention pour toute nouvelle campagne

1. **Éviter par défaut le partage d'un même code ROME entre deux campagnes actives.** Préférer
   des codes ROME propres à chaque campagne quand c'est possible.
2. **Si un code ROME générique doit être partagé** (le métier visé est réellement à cheval sur
   deux périmètres de campagne), les `keywords` de chacune des campagnes doivent être
   suffisamment spécifiques et non chevauchants pour se distinguer côté résultats — le filtre
   centralisé (`offerMatchesQuery`, JOB-73) rejette déjà toute offre qui ne matche aucun
   mot-clé de la requête, donc des mots-clés bien choisis suffisent à limiter la pollution
   croisée même en cas de code ROME partagé.
3. **Vérifier ce point à chaque création ou modification de campagne** — en particulier quand
   une nouvelle campagne réutilise un code ROME déjà présent dans une autre campagne active.

## Automatisation (hors périmètre de ce ticket)

La Definition of Done de JOB-71 ne demande qu'un document de convention + un audit vérifié des
campagnes existantes, pas un contrôle automatisé. Un candidat naturel pour une vérification
outillée plus tard serait `lib/harvester/campaign-validation.ts` (schémas Zod déjà utilisés pour
valider la création/modification de campagne côté Server Actions) : on pourrait y ajouter une
vérification croisée avec les campagnes existantes de l'utilisateur pour avertir (pas
nécessairement bloquer) en cas de code ROME partagé sans recouvrement de mots-clés. Non
implémenté ici — à faire dans un ticket dédié si ce risque se matérialise en usage réel.
