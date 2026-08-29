# Audit de contraste AA — tokens de design (JOB-112)

Audit exhaustif des paires token-texte/token-fond sémantiques de `app/globals.css` (clair + sombre), au seuil WCAG AA (4.5:1 texte normal, 3:1 texte large — aucune paire ici n'a été considérée "large", tous les usages identifiés sont du texte normal ou des badges petits/gras).

Outil : `scripts/audit-contrast.ts` (`npx tsx scripts/audit-contrast.ts`). Réexécuter après toute modification de `app/globals.css` touchant les tokens de couleur.

## Résultat final : 48/48 paires passent (0 échec)

24 paires × 2 thèmes (`contract-fg`/`contract-bg` ajoutée en JOB-124, 6.22:1 clair / 7.25:1 sombre — passe d'emblée, aucune correction nécessaire). Voir la sortie complète de l'outil pour le détail (chaque paire liste `fg`/`bg` résolus et le ratio calculé).

## Corrections apportées suite à l'audit

6 paires étaient sous le seuil 4.5:1 avant correction ; toutes corrigées en ajustant directement le token source dans `app/globals.css` (jamais de correctif local dans un composant) :

| Paire | Avant | Ratio avant | Après | Ratio après |
|---|---|---|---|---|
| `muted-foreground`/`muted` (clair) | `#7b6f92` | 3.88:1 | `#5f5476` | 5.82:1 |
| `brand-positive-foreground`/`brand-positive` (clair) | bg `#0f9d71` | 3.45:1 | bg `#0b7d5a` | 5.13:1 |
| `warn`/`background` (clair) | `#c67c1e` | 3.04:1 | `#8a5a14` | 5.38:1 |
| `warn`/`card` (clair) | `#c67c1e` | 3.33:1 | `#8a5a14` | 5.91:1 |
| `primary-foreground`/`primary` (sombre) | fg `#faf6fc` | 2.87:1 | fg `#170a29` | 6.15:1 |
| `destructive-foreground`/`destructive` (sombre) | fg `#1d1727`, bg `#7c6f91` | 3.77:1 | fg `#f2eff7`, bg `#6b5f80` | 5.17:1 |

Note : `--warn` étant repris à deux endroits (fond `background` et fond `card`), l'unique correction du token corrige les deux paires simultanément.

## Portée de l'audit

Paires couvertes : `foreground`/`background`, `card-foreground`/`card`, `popover-foreground`/`popover`, `primary-foreground`/`primary`, `secondary-foreground`/`secondary`, `muted-foreground`/`muted`, `accent-foreground`/`accent`, `destructive-foreground`/`destructive`, `brand-positive-foreground`/`brand-positive`, les 5 paires de statut (`status-*-fg`/`status-*-bg`), `contract-fg`/`contract-bg` (badge de type de contrat, JOB-124), `warn` et `danger` sur `background` et `card` (tokens texte-seul), `heading` sur `background` et `card`, et les 3 paires `sidebar-*` (composant non utilisé actuellement mais dont les tokens existent).

Non couvert (hors scope, valeurs non-hex ignorées par l'outil) : `--sidebar-border` en `oklch(...)` dans le thème sombre — ce n'est pas une paire texte/fond, pas concerné par un audit de contraste de lisibilité.
