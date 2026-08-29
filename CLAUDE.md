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
