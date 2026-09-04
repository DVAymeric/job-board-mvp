# Graph Report - job-board-mvp  (2026-09-04)

## Corpus Check
- 425 files · ~236,288 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1699 nodes · 3868 edges · 145 communities (86 shown, 59 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.75)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f3e1f673`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- bento-card.tsx
- discovery.ts
- probe-talentsoft.ts
- francetravail/client.ts
- auth-actions.ts
- logActionError
- discoverTargets — orchestrateur de découverte de cibles connecteurs
- prisma.ts
- review-queue-manager.tsx
- board.tsx
- user-agent.ts
- validation.ts
- board-critical-path.spec.ts
- harvest-query.ts
- talentsoft/normalize.ts
- compilerOptions
- _shared.ts
- logger.ts
- cn
- harvest.ts
- workday/client.ts
- campaigns.ts
- recherche/page.tsx
- rate-limited-fetch.ts
- constants.ts
- components.json
- status-timeline.tsx
- analytics/page.tsx
- welcometothejungle/client.ts
- STATUS
- digitalrecruiters/types.ts
- smartrecruiters/client.ts
- talentsoft/types.ts
- Suivi de candidatures (app)
- @dnd-kit/utilities
- talentsoft/client.ts
- application-heatmap.tsx
- @dnd-kit/core
- interview-reminder-watcher.tsx
- apple-icon.tsx
- requireUser
- alert-dialog.tsx
- discover-targets.ts
- audit-contrast.ts
- layout.tsx
- actions.isolation.integration.test.ts
- salary.ts
- review/page.tsx
- ics.ts
- Champ "Métier recherché" (suggestion ROME par recherche floue) — Design
- devDependencies
- class-variance-authority
- tabs.tsx
- job-card.tsx
- labonnealternance/normalize.ts
- @axe-core/playwright
- scripts
- badge.tsx
- auth.ts
- lib/csv-export.ts
- InMemorySlidingWindowRateLimiter
- campaign-validation.ts
- dependencies
- lib/types.ts
- Champ "Métier recherché" Implementation Plan
- contacts.ts
- francetravail/normalize.ts
- rome-search.ts
- package.json
- harvester-campaigns.spec.ts
- job-dialog.tsx
- account-view.tsx
- next.config.ts
- next-auth.d.ts
- ResizeObserverStub
- confidentialite/page.tsx
- Échelle typographique et espacements (a11y, JOB-87)
- Simplification grand public du Harvester — Implementation Plan
- offline-cache-safety.spec.ts
- manifest.ts
- instrumentation.ts
- orchestrator.ts
- proxy.ts
- board-keyboard.ts
- clsx
- import-rome-referentiel.ts
- @dnd-kit/sortable
- harvest/route.ts
- eslint.config.mjs
- eslint-config-next
- instrumentation-client.ts
- discovery-schema.integration.test.ts
- harvester-schema.integration.test.ts
- next
- next-auth
- playwright
- playwright-core
- prisma
- @prisma/client
- react
- react-dom
- robots-parser
- @sentry/nextjs
- shadcn
- sonner
- @sparticuz/chromium
- tailwind-merge
- tw-animate-css
- ulid
- yaml
- zod
- @playwright/test
- tailwindcss
- @tailwindcss/postcss
- @testing-library/dom
- @testing-library/jest-dom
- @testing-library/react
- @testing-library/user-event
- company-avatar.tsx
- @types/react
- vite-tsconfig-paths
- vitest
- @vitest/coverage-v8
- postcss.config.mjs
- vercel.json
- { GET, POST }
- Bloc de règles Next.js agent (auto-régénéré par next dev)
- Procédure de rollback (code applicatif + schéma de base)
- home-content.tsx
- Vocabulaire grand public pour la section Harvester (JOB-149, JOB-150)
- Devenir de "Cibles découvertes" pour la navigation grand public (JOB-153)
- campaigns.isolation.integration.test.ts
- recherche/loading.tsx
- db-security.ts
- cheerio
- typescript

## God Nodes (most connected - your core abstractions)
1. `cn()` - 95 edges
2. `requireUser()` - 66 edges
3. `logActionError()` - 43 edges
4. `prisma` - 43 edges
5. `actionError()` - 40 edges
6. `firstIssueMessage()` - 36 edges
7. `HarvestQuery` - 30 edges
8. `Button()` - 29 edges
9. `exactDedupKeyFromSource()` - 28 edges
10. `STATUS` - 22 edges

## Surprising Connections (you probably didn't know these)
- `mockAuthedAs()` --indirect_call--> `requireUser()`  [INFERRED]
  app/actions/campaigns.test.ts → lib/auth/session.ts
- `mockUnauthenticated()` --indirect_call--> `requireUser()`  [INFERRED]
  app/actions/campaigns.test.ts → lib/auth/session.ts
- `mockAuthedAs()` --indirect_call--> `requireUser()`  [INFERRED]
  app/actions/csv-export.test.ts → lib/auth/session.ts
- `mockAuthedAs()` --indirect_call--> `requireUser()`  [INFERRED]
  app/actions/discovery.test.ts → lib/auth/session.ts
- `mockAuthedAs()` --indirect_call--> `requireUser()`  [INFERRED]
  app/actions/harvest.test.ts → lib/auth/session.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Sondes de découverte de cibles connecteurs (Workday/SmartRecruiters/Talentsoft/DigitalRecruiters) orchestrées par discoverTargets** — docs_superpowers_plans_20260830_decouverte_probeworkday, docs_superpowers_plans_20260830_decouverte_probesmartrecruiters, docs_superpowers_plans_20260830_decouverte_probetalentsoft, docs_superpowers_plans_20260830_decouverte_probedigitalrecruiters, docs_superpowers_plans_20260830_decouverte_discovertargets [EXTRACTED 1.00]
- **Fusion des schémas Harvester → Prisma : Campaign, HarvestedOffer, ConnectorRun** — docs_superpowers_plans_20260818_job40_campaign_model, docs_superpowers_plans_20260818_job40_harvestedoffer_model, docs_superpowers_plans_20260818_job40_connectorrun_model [EXTRACTED 1.00]
- **Portage progressif de job-harvester vers job-board-mvp** — job_harvester_origin_repo, docs_decision_pas_de_serveur_hono_decision, docs_decision_scheduling_harvester_decision, docs_superpowers_plans_20260818_job40_campaign_model, docs_superpowers_plans_20260830_decouverte_discovertargets [INFERRED 0.85]

## Communities (145 total, 59 thin omitted)

### Community 0 - "bento-card.tsx"
Cohesion: 0.09
Nodes (21): Loading(), FEATURES, TarifsPage(), AboutCard(), CampaignsCard(), CampaignsCardProps, HarvesterOverview(), HarvesterOverviewProps (+13 more)

### Community 1 - "discovery.ts"
Cohesion: 0.09
Nodes (28): approveDiscoveredTarget(), PLATFORM_TO_TARGETS_KEY, rejectDiscoveredTarget(), mockAuthedAs(), DiscoveredTargetsManager(), handleApprove(), handleReject(), removeTarget() (+20 more)

### Community 2 - "probe-talentsoft.ts"
Cohesion: 0.23
Nodes (9): candidateDomains(), looksLikeTalentsoft(), probeTalentsoft(), withTimeout(), getRobots(), isAllowedByRobots(), Robots, robotsCache (+1 more)

### Community 3 - "francetravail/client.ts"
Cohesion: 0.06
Nodes (48): ALTERNANCE_ONLY_TYPES, authHeaders(), buildSearchUrl(), CachedToken, checkFranceTravailHealth(), fetchFranceTravailOffers(), FranceTravailClientOptions, getAccessToken() (+40 more)

### Community 4 - "auth-actions.ts"
Cohesion: 0.19
Nodes (9): AuthFormState, loginAction(), registerAction(), registerSchema, registerUser(), initialState, LoginForm(), initialState (+1 more)

### Community 5 - "logActionError"
Cohesion: 0.18
Nodes (32): addContact(), clearHarvestedOffers(), ignoreHarvestedOffer(), updateJobContractType(), updateJobDetails(), updateJobDocuments(), updateJobInterviewDate(), updateJobNotes() (+24 more)

### Community 6 - "discoverTargets — orchestrateur de découverte de cibles connecteurs"
Cohesion: 0.07
Nodes (35): Décision : pas de serveur HTTP Hono pour Harvester (JOB-48), Simplification actée : une cadence cron globale plutôt qu'une par campagne, Décision : déclenchement planifié via Vercel Cron (JOB-52), Convention codes ROME pour les campagnes de collecte (JOB-71), Décision : post-filtre centralisé contrat/mots-clés/localisation (JOB-73), resolveLocationVerdict — cascade de vérification de localisation à 3 niveaux, Isolation multi-tenant Harvester (scoping userId), Rate limiting du déclenchement de collecte (prévu pour les tickets 9/14) (+27 more)

### Community 7 - "prisma.ts"
Cohesion: 0.16
Nodes (7): mockAuthedAs(), BOARD_JOBS_SAFETY_LIMIT, can(), ENTITLEMENTS, Feature, globalForPrisma, prisma

### Community 8 - "review-queue-manager.tsx"
Cohesion: 0.15
Nodes (13): ContactsSection(), handleAdd(), CONTRACT_TYPE_OPTIONS, SearchForm(), Input(), SelectContent(), SelectItem(), SelectScrollDownButton() (+5 more)

### Community 9 - "board.tsx"
Cohesion: 0.14
Nodes (9): Column(), EnrichmentPollWatcher(), ExportCsvButton(), handleExport(), CampaignRow(), UrlCheckBar(), UrlCheckBarProps, UrlCheckResultTag (+1 more)

### Community 10 - "user-agent.ts"
Cohesion: 0.23
Nodes (6): probeDigitalRecruiters(), probeSmartRecruiters(), DC_CANDIDATES, DiscoveredWorkdayTarget, probeWorkday(), USER_AGENT

### Community 11 - "validation.ts"
Cohesion: 0.08
Nodes (39): CONTACT_ROLE, ALLOWED_PROTOCOLS, isDisallowedFetchTarget(), isPrivateOrLoopbackHostname(), isPrivateOrLoopbackIPv4(), normalizeUrl(), SENSITIVE_PARAMS, TRACKING_PARAMS (+31 more)

### Community 12 - "board-critical-path.spec.ts"
Cohesion: 0.07
Nodes (12): prisma, prisma, stamp, FIXTURE_HTML, FixtureServer, startFixtureServer(), prisma, stamp (+4 more)

### Community 13 - "harvest-query.ts"
Cohesion: 0.12
Nodes (25): ConnectorContext, checkDigitalRecruitersHealth(), DIGITALRECRUITERS_CONNECTOR_ID, DigitalRecruitersClientOptions, fetchDigitalRecruitersOffers(), fetchJobAdsPage(), headers(), query (+17 more)

### Community 14 - "talentsoft/normalize.ts"
Cohesion: 0.09
Nodes (30): canonicalizeUrl(), TRACKING_PARAM_PREFIXES, TRACKING_PARAMS_EXACT, LEGAL_SUFFIXES, normalizeCompanyName(), companyNameFromDomain(), normalizeDigitalRecruitersOffer(), parseLocationFromSlug() (+22 more)

### Community 15 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 16 - "_shared.ts"
Cohesion: 0.16
Nodes (18): CHECK_JOB_URL_RATE_LIMIT, CREATE_JOB_RATE_LIMIT, createJob(), enrichJob(), KnownJobFields, afterCallbacks, mockAuthedAs(), fetchCompanyLogo() (+10 more)

### Community 17 - "logger.ts"
Cohesion: 0.05
Nodes (50): BanFeature, geocodeCity(), GeocodedCity, LocationInput, ResolvedLocation, ResolveLocationsResult, LogFields, logger (+42 more)

### Community 18 - "cn"
Cohesion: 0.10
Nodes (25): logoutAction(), LINKS, MobileMenu(), Nav(), noopSubscribe(), session, ThemeToggle(), useMounted() (+17 more)

### Community 19 - "harvest.ts"
Cohesion: 0.12
Nodes (17): CONNECTORS_HEALTH_GLOBAL_RATE_LIMIT, CONNECTORS_HEALTH_RATE_LIMIT, getConnectorsHealth(), importHarvestedOffer(), __resetConnectorsHealthRateLimitsForTests(), { afterTasks }, mockAuthedAs(), mockUnauthenticated() (+9 more)

### Community 20 - "workday/client.ts"
Cohesion: 0.10
Nodes (28): buildSearchTerms(), checkWorkdayHealth(), CONTRACT_SEARCH_TERMS, cxsBaseUrl(), fetchJobDetail(), fetchJobList(), fetchWorkdayOffers(), headers() (+20 more)

### Community 21 - "campaigns.ts"
Cohesion: 0.12
Nodes (23): createCampaign(), deleteCampaign(), listCampaigns(), reorderCampaigns(), searchMetiers(), geocodedLille, mockAuthedAs(), mockGeocodingSuccess() (+15 more)

### Community 22 - "recherche/page.tsx"
Cohesion: 0.15
Nodes (16): criteriaFromSearchParams(), firstParam(), RecherchePage(), JobResult, JobResultRow(), baseResult, EMPTY_CRITERIA, OfferSearch() (+8 more)

### Community 23 - "rate-limited-fetch.ts"
Cohesion: 0.26
Nodes (6): createRateLimitedFetch(), DEFAULT_RETRY_DELAYS_MS, extractHostname(), RateLimitedFetchOptions, sleep(), TokenBucket

### Community 24 - "constants.ts"
Cohesion: 0.13
Nodes (14): CONTACT_ROLE_LABELS, CONTACT_ROLE_ORDER, ContactRole, FOLLOW_UP_DAYS, isJobContractType(), JOB_CONTRACT_TYPE, JOB_CONTRACT_TYPE_LABELS, JOB_CONTRACT_TYPE_ORDER (+6 more)

### Community 25 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 27 - "analytics/page.tsx"
Cohesion: 0.14
Nodes (16): AnalyticsPage(), AnalyticsEmptyState(), buildInterviewSentence(), FunnelChart(), stages, Card(), CardAction(), CardContent() (+8 more)

### Community 28 - "welcometothejungle/client.ts"
Cohesion: 0.15
Nodes (16): buildParams(), checkWttjHealth(), escapeRegExp(), fetchWttjOffers(), getWttjCredentials(), headers(), matchesKeywords(), queryJobsIndex() (+8 more)

### Community 29 - "STATUS"
Cohesion: 0.16
Nodes (14): StatusList(), StatusListProps, statusCounts, STATUS_BADGE_CLASSNAME, STATUS_ICONS, StatusBadge(), StatusBadgeProps, JobStatus (+6 more)

### Community 30 - "digitalrecruiters/types.ts"
Cohesion: 0.29
Nodes (6): DigitalRecruitersJobAd, DigitalRecruitersJobAdSchema, DigitalRecruitersRawOffer, DigitalRecruitersRawOfferSchema, DigitalRecruitersSearchResponse, DigitalRecruitersSearchResponseSchema

### Community 31 - "smartrecruiters/client.ts"
Cohesion: 0.13
Nodes (19): checkSmartRecruitersHealth(), CONTRACT_TITLE_PATTERNS, fetchPostingDetail(), fetchPostingsList(), fetchSmartRecruitersOffers(), headers(), matchesContractTypes(), SMARTRECRUITERS_CONNECTOR_ID (+11 more)

### Community 32 - "talentsoft/types.ts"
Cohesion: 0.40
Nodes (4): TalentsoftRawOffer, TalentsoftRawOfferSchema, TalentsoftRssItem, TalentsoftRssItemSchema

### Community 33 - "Suivi de candidatures (app)"
Cohesion: 0.15
Nodes (19): Service Postgres local (docker-compose), Chiffrement at-rest (à confirmer au provisionnement), Chiffrement in-transit (TLS forcé en production), Revue explicite des secrets (JOB-118), Procédure de rotation des secrets en cas de fuite, Procédure de déploiement, Drill de restauration testé (pg_dump/pg_restore contre docker-compose), Politique de rétention des sauvegardes (à activer au provisionnement) (+11 more)

### Community 35 - "talentsoft/client.ts"
Cohesion: 0.20
Nodes (15): checkTalentsoftHealth(), decodeXmlEntities(), detectTalentsoftPlatform(), extractAllTags(), extractTag(), fetchRssItems(), fetchTalentsoftOffers(), headers() (+7 more)

### Community 36 - "application-heatmap.tsx"
Cohesion: 0.24
Nodes (11): ApplicationHeatmap(), formatCellTitle(), isHighContrastLevel(), legendCount(), LEVEL_3_THRESHOLDS, LEVEL_OPACITY, levelStyle(), buildHeatmapDays() (+3 more)

### Community 38 - "interview-reminder-watcher.tsx"
Cohesion: 0.24
Nodes (4): InterviewReminderWatcher(), FakeNotification, getUpcomingInterviews(), InterviewCandidate

### Community 39 - "apple-icon.tsx"
Cohesion: 0.16
Nodes (7): contentType, size, dynamic, dynamic, contentType, size, AppIconMark()

### Community 40 - "requireUser"
Cohesion: 0.19
Nodes (12): exportJobsCsv(), mockAuthedAs(), checkJobUrl(), mockAuthedAs(), mockAuthedAs(), mockAuthedAs(), knownJob, CurrentUser (+4 more)

### Community 41 - "alert-dialog.tsx"
Cohesion: 0.28
Nodes (11): AlertDialog(), AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter(), AlertDialogHeader(), AlertDialogMedia() (+3 more)

### Community 42 - "discover-targets.ts"
Cohesion: 0.15
Nodes (13): companySlug(), ALL_PLATFORMS, createDiscoveredTargetIfMissing(), discoverTargets(), DiscoverTargetsOptions, DiscoverTargetsSummary, createdOfferIds, prisma (+5 more)

### Community 43 - "audit-contrast.ts"
Cohesion: 0.16
Nodes (13): audit(), contrastRatio(), css, CSS_PATH, darkFails, darkTokens, hexToRgb(), lightFails (+5 more)

### Community 44 - "layout.tsx"
Cohesion: 0.05
Nodes (33): atkinsonHyperlegible, bricolageGrotesque, geistMono, metadata, viewport, maxDuration, StatTile(), StatTileProps (+25 more)

### Community 46 - "salary.ts"
Cohesion: 0.36
Nodes (6): SALARY_TYPE, SalaryType, WORKING_DAYS_PER_YEAR, formatSalary(), formatThousands(), normalizeAnnualSalary()

### Community 47 - "review/page.tsx"
Cohesion: 0.22
Nodes (9): HarvesterCampaignsPage(), HarvesterPage(), HarvesterReviewPage(), HarvesterTabs(), HarvesterTabsProps, TABS, PageHeader(), PageHeaderProps (+1 more)

### Community 48 - "ics.ts"
Cohesion: 0.43
Nodes (5): handleExportIcs(), buildInterviewIcs(), escapeIcsText(), IcsJob, toIcsUtc()

### Community 49 - "Champ "Métier recherché" (suggestion ROME par recherche floue) — Design"
Cohesion: 0.15
Nodes (12): 1. Référentiel — `lib/harvester/rome-referentiel.json`, 2. Recherche floue — `lib/harvester/rome-search.ts`, 3. Server Action — `app/actions/campaigns.ts`, 4. UI — `CampaignFormDialog`, Champ "Métier recherché" (suggestion ROME par recherche floue) — Design, Composants, Contexte, Décisions actées (brainstorming) (+4 more)

### Community 50 - "devDependencies"
Cohesion: 0.15
Nodes (13): eslint, jsdom, devDependencies, eslint, jsdom, tsx, @types/node, @types/react-dom (+5 more)

### Community 52 - "tabs.tsx"
Cohesion: 0.48
Nodes (4): Tabs(), TabsList(), TabsPanel(), TabsTab()

### Community 53 - "job-card.tsx"
Cohesion: 0.26
Nodes (8): getDisplayTitle(), JobCard(), handleDelete(), STATUS_DATE_LABEL, FOLLOW_UP_BADGE_CLASSNAME, JobContractType, STATUS_CONFIG, getCurrentStatusDate()

### Community 54 - "labonnealternance/normalize.ts"
Cohesion: 0.14
Nodes (18): authHeaders(), buildSearchUrl(), checkLbaHealth(), fetchLbaOffers(), LBA_CONNECTOR_ID, LbaClientOptions, query, mapContractType() (+10 more)

### Community 56 - "scripts"
Cohesion: 0.17
Nodes (12): scripts, build, dev, import-harvester-campaigns, import-rome-referentiel, lint, seed:dev, start (+4 more)

### Community 57 - "badge.tsx"
Cohesion: 0.17
Nodes (12): Badge(), badgeVariants, addValue(), addValues(), ChipInput(), commitDraft(), handleBlur(), handleKeyDown() (+4 more)

### Community 58 - "auth.ts"
Cohesion: 0.35
Nodes (5): { handlers, signIn, signOut, auth }, authorizeCredentials(), AuthorizedUser, hashPassword(), verifyPassword()

### Community 59 - "lib/csv-export.ts"
Cohesion: 0.31
Nodes (6): buildJobsCsv(), CSV_HEADERS, escapeCsvField(), ExportableJob, formatDate(), ExportJob

### Community 60 - "InMemorySlidingWindowRateLimiter"
Cohesion: 0.28
Nodes (3): InMemorySlidingWindowRateLimiter, RateLimiter, RateLimitResult

### Community 61 - "campaign-validation.ts"
Cohesion: 0.20
Nodes (9): CAMPAIGN_CONTRACT_TYPES, campaignFieldsSchema, campaignIdSchema, campaignLocationInputSchema, createCampaignSchema, deleteCampaignSchema, reorderCampaignsSchema, romeCodeSchema (+1 more)

### Community 62 - "dependencies"
Cohesion: 0.29
Nodes (7): @base-ui/react, lucide-react, next-themes, dependencies, @base-ui/react, lucide-react, next-themes

### Community 63 - "lib/types.ts"
Cohesion: 0.12
Nodes (12): Board(), jobs, baseJob, computeReorderedColumn(), isJobStatus(), matchesJobQuery(), matchesSelectedTags(), job() (+4 more)

### Community 64 - "Champ "Métier recherché" Implementation Plan"
Cohesion: 0.20
Nodes (9): Champ "Métier recherché" Implementation Plan, Final Verification, Global Constraints, Task 1: Champ `metiers` — schéma Prisma et validation Zod, Task 2: Script d'import du référentiel ROME, Task 3: Recherche floue sur le référentiel, Task 4: Server Action `searchMetiers`, Task 5: Champ "Métier recherché" dans le formulaire de campagne (+1 more)

### Community 65 - "contacts.ts"
Cohesion: 0.39
Nodes (6): deleteContact(), updateContact(), contactOwnerWhere(), ContactRow(), handleDelete(), handleSave()

### Community 66 - "francetravail/normalize.ts"
Cohesion: 0.23
Nodes (8): FRANCE_TRAVAIL_CONNECTOR_ID, francetravailConnector, mapContractType(), normalizeFranceTravailOffer(), parseLieuTravail(), resolveApplyUrl(), resolveOriginSource(), fixturesDir

### Community 67 - "rome-search.ts"
Cohesion: 0.36
Nodes (6): MetierMatch, normalize(), normalizedReferentiel, searchRomeReferentiel(), trigrams(), trigramSimilarity()

### Community 68 - "package.json"
Cohesion: 0.33
Nodes (5): name, overrides, deepmerge-ts, private, version

### Community 70 - "job-dialog.tsx"
Cohesion: 0.09
Nodes (22): CampaignConfigJsonSchema, CampaignFormDialog(), buildPayload(), handleDelete(), EMPTY_LOCATION, LocationInput, locationsFromCampaign(), SCHEDULE_OPTIONS (+14 more)

### Community 71 - "account-view.tsx"
Cohesion: 0.39
Nodes (4): deleteAccount(), AccountView(), handleDeleteAccount(), push

### Community 73 - "next-auth.d.ts"
Cohesion: 0.40
Nodes (4): JWT, next-auth, next-auth/jwt, Session

### Community 76 - "Échelle typographique et espacements (a11y, JOB-87)"
Cohesion: 0.50
Nodes (4): Échelle typographique et espacements (a11y, JOB-87), Audit de contraste AA des tokens de design (JOB-112/124), Correctif JOB-102 : BentoSection conservée (données personnalisées, pas du marketing statique), Décision produit : rôle de la page d'accueil (JOB-101)

### Community 77 - "Simplification grand public du Harvester — Implementation Plan"
Cohesion: 0.20
Nodes (9): Global Constraints, Simplification grand public du Harvester — Implementation Plan, Task 1: Composant générique `ChipInput` (JOB-147), Task 2: Brancher `ChipInput` sur le champ "Mots-clés" du formulaire de campagne (JOB-148), Task 3: Dictionnaire de libellés lisibles pour les sources/connecteurs (JOB-150), Task 4: Refondre la file de revue en liste de cartes (JOB-152), Task 5: Filtre par campagne dans la file de revue (JOB-154), Task 6: Traduire le vocabulaire technique restant en langage grand public (JOB-149) (+1 more)

### Community 81 - "orchestrator.ts"
Cohesion: 0.07
Nodes (40): Connector, exactDedupKeyFromSource(), FUZZY_MATCH_THRESHOLD, isDuplicate(), isExactDuplicate(), isFuzzyDuplicate(), mergeOffers(), unionSourceRefs() (+32 more)

### Community 82 - "proxy.ts"
Cohesion: 0.32
Nodes (5): authGuard, config, PROTECTED_PREFIXES, proxy(), authHandlerCalls

### Community 83 - "board-keyboard.ts"
Cohesion: 0.43
Nodes (5): handleKeyDown(), adjacentStatus(), BoardColumn, computeNextFocusedJob(), FocusDirection

### Community 85 - "import-rome-referentiel.ts"
Cohesion: 0.38
Nodes (6): AppellationRow, CodeRomeRow, extractJson(), findEntry(), main(), OUTPUT_PATH

### Community 118 - "company-avatar.tsx"
Cohesion: 0.47
Nodes (4): AvatarJob, CompanyAvatar(), getInitial(), base

### Community 137 - "home-content.tsx"
Cohesion: 0.47
Nodes (3): HeroSection(), HeroSectionProps, ViewState

### Community 138 - "Vocabulaire grand public pour la section Harvester (JOB-149, JOB-150)"
Cohesion: 0.33
Nodes (5): Contexte, Correction (2026-09-01), Lexique validé, Portée : uniquement le texte affiché, Vocabulaire grand public pour la section Harvester (JOB-149, JOB-150)

### Community 139 - "Devenir de "Cibles découvertes" pour la navigation grand public (JOB-153)"
Cohesion: 0.40
Nodes (4): Contexte, Devenir de "Cibles découvertes" pour la navigation grand public (JOB-153), Décision, Portée du changement

### Community 140 - "campaigns.isolation.integration.test.ts"
Cohesion: 0.50
Nodes (3): asA(), baseCampaignInput, createCampaignAsA()

## Knowledge Gaps
- **455 isolated node(s):** `baseCampaignInput`, `geocodedLille`, `validInput`, `PLATFORM_TO_TARGETS_KEY`, `{ afterTasks }` (+450 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **59 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `bento-card.tsx`, `application-heatmap.tsx`, `job-dialog.tsx`, `review-queue-manager.tsx`, `board.tsx`, `alert-dialog.tsx`, `layout.tsx`, `review/page.tsx`, `tabs.tsx`, `job-card.tsx`, `company-avatar.tsx`, `recherche/page.tsx`, `badge.tsx`, `analytics/page.tsx`, `STATUS`, `lib/types.ts`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `logger` connect `logger.ts` to `talentsoft/client.ts`, `requireUser`, `discover-targets.ts`, `harvest-query.ts`, `_shared.ts`, `orchestrator.ts`, `harvest.ts`, `recherche/page.tsx`, `harvest/route.ts`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `prisma` connect `prisma.ts` to `contacts.ts`, `discovery.ts`, `auth-actions.ts`, `logActionError`, `requireUser`, `campaigns.isolation.integration.test.ts`, `actions.isolation.integration.test.ts`, `layout.tsx`, `review/page.tsx`, `_shared.ts`, `harvest.ts`, `campaigns.ts`, `recherche/page.tsx`, `harvest/route.ts`, `auth.ts`, `analytics/page.tsx`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Are the 11 inferred relationships involving `requireUser()` (e.g. with `mockAuthedAs()` and `mockUnauthenticated()`) actually correct?**
  _`requireUser()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **What connects `baseCampaignInput`, `geocodedLille`, `validInput` to the rest of the system?**
  _455 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `bento-card.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09047619047619047 - nodes in this community are weakly interconnected._
- **Should `discovery.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08819345661450925 - nodes in this community are weakly interconnected._