@AGENTS.md

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Échelle typographique et espacements

Usage ad hoc évité : chaque rôle de texte a une classe Tailwind fixe. `app/page.tsx`,
`components/board/board.tsx` et `components/board/job-card.tsx` suivent strictement
cette échelle (référence à copier telle quelle, pas à réinventer par écran).

Principe (JOB-87, a11y) : le corps de texte principal est à 16px minimum partout. Les
deux seules exceptions ci-dessous (eyebrow, meta technique/numérique) restent à 12px
car strictement décoratives/secondaires — elles ne sont jamais seules porteuses d'une
information essentielle.

| Rôle | Classes | Exemple |
|---|---|---|
| Eyebrow / kicker | `font-mono text-xs uppercase tracking-widest text-muted-foreground` — *exception : texte décoratif secondaire* | Sur-titre de la page d'accueil |
| Titre de page | `font-heading text-2xl text-heading` | `<h1>` de `/`, `/board`, `/analytics` |
| Wordmark (nav) | `font-heading text-lg italic text-heading` | Logo texte dans `components/nav.tsx` |
| Titre de section | `font-heading text-lg text-heading` | En-tête de colonne (`column.tsx`) |
| Titre de carte | `font-heading text-base leading-snug text-heading` | Titre dans `JobCard` |
| Label de formulaire | `text-base font-medium` | Labels d'`Input`/`Textarea` dans `JobSheet` |
| Corps de texte | `text-base text-muted-foreground` | Sous-titres, descriptions, états vides |
| Meta | `text-sm text-muted-foreground` | Info secondaire en prose (ex. nom d'entreprise sous le titre) |
| Meta technique/numérique | `font-mono text-xs text-muted-foreground` — *exception : dates/compteurs secondaires* | Dates, compteurs (mono pour l'alignement des chiffres) |
| Valeur chiffrée mise en avant | `font-heading text-2xl text-heading` | Chiffre des mini-stats bento (`status-detail-card.tsx`) |
| Label de statut | `font-mono text-sm font-bold` + couleur du statut (`STATUS_CONFIG[status].textClassName`, pas de fond) | Statut dans `JobCard` |

Espacements observés et à réutiliser (ne pas en inventer d'autres sans raison) :

| Rôle | Classes |
|---|---|
| Padding de page | `p-4` |
| Pile verticale de sections | `space-y-4` / `gap-4` ; `gap-6` pour les blocs majeurs (ex. graphique + tableau) |
| Groupe inline (boutons, icône+texte) | `gap-2` |
| Rangée compacte (badges, tags) | `gap-1.5` |
| Pile de champs de formulaire | `space-y-1.5` |
| Padding interne de carte/ligne | `p-3` (lignes de liste), `p-2` (cartes compactes/colonnes) |

Rayons et ombres (JOB-88) — `--radius` de base passé à `0.625rem` (10px) pour que
`rounded-lg` (boutons, inputs) tombe pile sur la cible du mockup. `rounded-xl`
(cartes, dialogs — déjà utilisé par `card.tsx`/`dialog.tsx`) en découle à 14px,
2px au-dessus de la cible mockup (12px) : écart mineur assumé plutôt que de
retoucher les multiplicateurs de toute l'échelle `--radius-*` sans audit complet
de chaque usage existant. `rounded-2xl` (18px) tombe exactement sur la cible
« cadre d'écran / panneau large » du mockup et n'est pas encore utilisé —
à privilégier pour tout nouveau grand conteneur plutôt que d'introduire un
nouveau token.

| Rôle | Classes |
|---|---|
| Rayon bouton/input | `rounded-lg` (10px) |
| Rayon carte / dialog | `rounded-xl` (14px, existant) |
| Rayon cadre large / modale | `rounded-2xl` (18px) |
| Rayon pill/badge | `rounded-full` |
| Ombre carte | `shadow-card` |
| Ombre panneau/modale mis en avant | `shadow-panel` |
