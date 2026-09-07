# Graph Report - job-board-mvp  (2026-09-07)

## Corpus Check
- 428 files · ~239,464 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1707 nodes · 3902 edges · 162 communities (105 shown, 57 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.75)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7dadecee`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- bento-card.tsx
- import-harvester-campaigns.ts
- isAllowedByRobots
- francetravail/client.ts
- auth-actions.ts
- requireUser
- discoverTargets — orchestrateur de découverte de cibles connecteurs
- prisma.ts
- utils.ts
- job-card.tsx
- user-agent.ts
- validation.ts
- board-critical-path.spec.ts
- HarvestQuery
- smartrecruiters/normalize.ts
- compilerOptions
- _shared.ts
- fetch-strategy.ts
- cn
- harvest.ts
- workday/client.ts
- campaigns.ts
- button.tsx
- rate-limited-fetch.ts
- talentsoft/normalize.ts
- components.json
- job-dialog.tsx
- analytics/page.tsx
- welcometothejungle/client.ts
- JobStatus
- digitalrecruiters/normalize.ts
- smartrecruiters/client.ts
- talentsoft/types.ts
- Suivi de candidatures (app)
- @dnd-kit/utilities
- talentsoft/client.ts
- html-parser.ts
- @dnd-kit/core
- interview-reminder-watcher.tsx
- apple-icon.tsx
- session.ts
- alert-dialog.tsx
- discover-targets.ts
- audit-contrast.ts
- ReviewQueueManager
- query-filter.ts
- constants.ts
- review/page.tsx
- ics.ts
- Champ "Métier recherché" (suggestion ROME par recherche floue) — Design
- devDependencies
- class-variance-authority
- tabs.tsx
- json-ld.ts
- labonnealternance/client.ts
- @axe-core/playwright
- scripts
- badge.tsx
- auth.ts
- exportJobsCsv
- rate-limit.ts
- campaign-validation.ts
- dependencies
- board.tsx
- Champ "Métier recherché" Implementation Plan
- geocoding.ts
- francetravail/normalize.ts
- rome-search.ts
- package.json
- harvester-campaigns.spec.ts
- CampaignFormDialog
- application-heatmap.tsx
- next.config.ts
- next-auth.d.ts
- ResizeObserverStub
- confidentialite/page.tsx
- Échelle typographique et espacements (a11y, JOB-87)
- Simplification grand public du Harvester — Implementation Plan
- offline-cache-safety.spec.ts
- manifest.ts
- instrumentation.ts
- normalized-offer.ts
- proxy.ts
- layout.tsx
- clsx
- import-rome-referentiel.ts
- @dnd-kit/sortable
- harvest-query.ts
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
- exactDedupKeyFromSource
- @types/react
- vite-tsconfig-paths
- vitest
- @vitest/coverage-v8
- postcss.config.mjs
- vercel.json
- { GET, POST }
- Bloc de règles Next.js agent (auto-régénéré par next dev)
- Procédure de rollback (code applicatif + schéma de base)
- proof-stats.ts
- Vocabulaire grand public pour la section Harvester (JOB-149, JOB-150)
- Devenir de "Cibles découvertes" pour la navigation grand public (JOB-153)
- campaigns.isolation.integration.test.ts
- recherche/loading.tsx
- JobDialog
- url.ts
- typescript
- labonnealternance/normalize.ts
- query-filter.multi-connector.integration.test.ts
- connector-health-list.tsx
- logger.ts
- DiscoveredTargetsManager
- recherche/page.tsx
- discover-targets.integration.test.ts
- contacts.ts
- harvest/route.ts
- harvest.test.ts
- board-keyboard.ts
- probe-talentsoft.ts
- connector-health-panel.tsx
- company-avatar.tsx
- workday/normalize.test.ts
- status-timeline.tsx
- cheerio

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
10. `logger` - 28 edges

## Surprising Connections (you probably didn't know these)
- `mockAuthedAs()` --indirect_call--> `requireUser()`  [INFERRED]
  app/actions.error-codes.test.ts → lib/auth/session.ts
- `mockAuthedAs()` --indirect_call--> `requireUser()`  [INFERRED]
  app/actions.logging.test.ts → lib/auth/session.ts
- `mockAuthedAs()` --indirect_call--> `requireUser()`  [INFERRED]
  app/actions.rate-limit.test.ts → lib/auth/session.ts
- `mockAuthedAs()` --indirect_call--> `requireUser()`  [INFERRED]
  app/actions/campaigns.test.ts → lib/auth/session.ts
- `mockUnauthenticated()` --indirect_call--> `requireUser()`  [INFERRED]
  app/actions/campaigns.test.ts → lib/auth/session.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Sondes de découverte de cibles connecteurs (Workday/SmartRecruiters/Talentsoft/DigitalRecruiters) orchestrées par discoverTargets** — docs_superpowers_plans_20260830_decouverte_probeworkday, docs_superpowers_plans_20260830_decouverte_probesmartrecruiters, docs_superpowers_plans_20260830_decouverte_probetalentsoft, docs_superpowers_plans_20260830_decouverte_probedigitalrecruiters, docs_superpowers_plans_20260830_decouverte_discovertargets [EXTRACTED 1.00]
- **Fusion des schémas Harvester → Prisma : Campaign, HarvestedOffer, ConnectorRun** — docs_superpowers_plans_20260818_job40_campaign_model, docs_superpowers_plans_20260818_job40_harvestedoffer_model, docs_superpowers_plans_20260818_job40_connectorrun_model [EXTRACTED 1.00]
- **Portage progressif de job-harvester vers job-board-mvp** — job_harvester_origin_repo, docs_decision_pas_de_serveur_hono_decision, docs_decision_scheduling_harvester_decision, docs_superpowers_plans_20260818_job40_campaign_model, docs_superpowers_plans_20260830_decouverte_discovertargets [INFERRED 0.85]

## Communities (162 total, 57 thin omitted)

### Community 0 - "bento-card.tsx"
Cohesion: 0.09
Nodes (21): Loading(), FEATURES, TarifsPage(), AboutCard(), CampaignsCard(), CampaignsCardProps, HarvesterOverview(), HarvesterOverviewProps (+13 more)

### Community 1 - "import-harvester-campaigns.ts"
Cohesion: 0.25
Nodes (7): CampaignsFileSchema, mapYamlCampaignToCreateInput(), fixturesDir, importHarvesterCampaigns(), fixturePath, prisma, main()

### Community 2 - "isAllowedByRobots"
Cohesion: 0.39
Nodes (5): getRobots(), isAllowedByRobots(), Robots, robotsCache, robotsParser

### Community 3 - "francetravail/client.ts"
Cohesion: 0.11
Nodes (25): ALTERNANCE_ONLY_TYPES, authHeaders(), buildSearchUrl(), CachedToken, checkFranceTravailHealth(), fetchFranceTravailOffers(), FranceTravailClientOptions, getAccessToken() (+17 more)

### Community 4 - "auth-actions.ts"
Cohesion: 0.13
Nodes (13): AuthFormState, deleteAccount(), loginAction(), logoutAction(), registerAction(), registerSchema, AccountView(), handleDeleteAccount() (+5 more)

### Community 5 - "requireUser"
Cohesion: 0.25
Nodes (27): addContact(), approveDiscoveredTarget(), rejectDiscoveredTarget(), mockAuthedAs(), clearHarvestedOffers(), ignoreHarvestedOffer(), importHarvestedOffer(), triggerCampaignCollection() (+19 more)

### Community 6 - "discoverTargets — orchestrateur de découverte de cibles connecteurs"
Cohesion: 0.07
Nodes (35): Décision : pas de serveur HTTP Hono pour Harvester (JOB-48), Simplification actée : une cadence cron globale plutôt qu'une par campagne, Décision : déclenchement planifié via Vercel Cron (JOB-52), Convention codes ROME pour les campagnes de collecte (JOB-71), Décision : post-filtre centralisé contrat/mots-clés/localisation (JOB-73), resolveLocationVerdict — cascade de vérification de localisation à 3 niveaux, Isolation multi-tenant Harvester (scoping userId), Rate limiting du déclenchement de collecte (prévu pour les tickets 9/14) (+27 more)

### Community 7 - "prisma.ts"
Cohesion: 0.12
Nodes (11): mockAuthedAs(), asA(), createJobAsA(), BOARD_JOBS_SAFETY_LIMIT, assertDatabaseUrlIsEncrypted(), TLS_INDICATORS, can(), ENTITLEMENTS (+3 more)

### Community 8 - "utils.ts"
Cohesion: 0.17
Nodes (6): UrlCheckBar(), UrlCheckBarProps, UrlCheckResultTag, Input(), Skeleton(), SkeletonProps

### Community 9 - "job-card.tsx"
Cohesion: 0.23
Nodes (8): Column(), getDisplayTitle(), JobCard(), handleDelete(), STATUS_DATE_LABEL, baseJob, STATUS_CONFIG, getCurrentStatusDate()

### Community 10 - "user-agent.ts"
Cohesion: 0.23
Nodes (6): probeDigitalRecruiters(), probeSmartRecruiters(), DC_CANDIDATES, DiscoveredWorkdayTarget, probeWorkday(), USER_AGENT

### Community 11 - "validation.ts"
Cohesion: 0.11
Nodes (30): addContactSchema, addTagToJobSchema, checkJobUrlSchema, COMPANY_NAME_MAX_LENGTH, companyNameSchema, contactLinkedinUrlSchema, contactRoleSchema, createJobSchema (+22 more)

### Community 12 - "board-critical-path.spec.ts"
Cohesion: 0.07
Nodes (12): prisma, prisma, stamp, FIXTURE_HTML, FixtureServer, startFixtureServer(), prisma, stamp (+4 more)

### Community 13 - "HarvestQuery"
Cohesion: 0.15
Nodes (17): ConnectorContext, checkDigitalRecruitersHealth(), DIGITALRECRUITERS_CONNECTOR_ID, DigitalRecruitersClientOptions, fetchDigitalRecruitersOffers(), fetchJobAdsPage(), headers(), query (+9 more)

### Community 14 - "smartrecruiters/normalize.ts"
Cohesion: 0.17
Nodes (11): normalizeSmartRecruitersOffer(), fixturesDir, loadFixture(), loadRawOfferPayload(), SmartRecruitersPostingDetail, SmartRecruitersPostingDetailSchema, SmartRecruitersRawOffer, SmartRecruitersRawOfferSchema (+3 more)

### Community 15 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 16 - "_shared.ts"
Cohesion: 0.10
Nodes (28): mockAuthedAs(), CHECK_JOB_URL_RATE_LIMIT, checkJobUrl(), CREATE_JOB_RATE_LIMIT, createJob(), enrichJob(), KnownJobFields, afterCallbacks (+20 more)

### Community 17 - "fetch-strategy.ts"
Cohesion: 0.25
Nodes (12): ANTI_BOT_STATUS_CODES, fetchMetadataViaHttp(), REQUEST_HEADERS, scrapeJobMetadata(), EMPTY, fetchMetadataViaPlaywright(), launchBrowser(), EMPTY_SCRAPED_METADATA (+4 more)

### Community 18 - "cn"
Cohesion: 0.10
Nodes (28): LINKS, MobileMenu(), Nav(), noopSubscribe(), session, ThemeToggle(), useMounted(), Card() (+20 more)

### Community 19 - "harvest.ts"
Cohesion: 0.25
Nodes (9): CONNECTORS_HEALTH_GLOBAL_RATE_LIMIT, CONNECTORS_HEALTH_RATE_LIMIT, TRIGGER_COLLECTION_RATE_LIMIT, clearHarvestedOffersSchema, idSchema, ignoreHarvestedOfferSchema, importHarvestedOfferSchema, triggerCampaignCollectionSchema (+1 more)

### Community 20 - "workday/client.ts"
Cohesion: 0.13
Nodes (22): buildSearchTerms(), checkWorkdayHealth(), CONTRACT_SEARCH_TERMS, cxsBaseUrl(), fetchJobDetail(), fetchJobList(), fetchWorkdayOffers(), headers() (+14 more)

### Community 21 - "campaigns.ts"
Cohesion: 0.13
Nodes (19): createCampaign(), deleteCampaign(), listCampaigns(), reorderCampaigns(), searchMetiers(), geocodedLille, mockAuthedAs(), mockUnauthenticated() (+11 more)

### Community 22 - "button.tsx"
Cohesion: 0.19
Nodes (10): CampaignRow(), JobResult, JobResultRow(), baseResult, EMPTY_CRITERIA, OfferSearch(), SearchableOffer, Button() (+2 more)

### Community 23 - "rate-limited-fetch.ts"
Cohesion: 0.29
Nodes (5): createRateLimitedFetch(), extractHostname(), RateLimitedFetchOptions, sleep(), TokenBucket

### Community 24 - "talentsoft/normalize.ts"
Cohesion: 0.22
Nodes (10): companyNameFromDomain(), findAddressCategory(), normalizeTalentsoftOffer(), parseAddress(), stripReferencePrefix(), ADR-0004, normalizeWorkdayOffer(), inferContractTypeFromText() (+2 more)

### Community 25 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 26 - "job-dialog.tsx"
Cohesion: 0.11
Nodes (24): ContactsSection(), handleAdd(), CampaignConfigJsonSchema, EMPTY_LOCATION, LocationInput, SCHEDULE_OPTIONS, ScheduleOptionValue, WorkdayTargetInput (+16 more)

### Community 27 - "analytics/page.tsx"
Cohesion: 0.14
Nodes (14): AnalyticsPage(), AnalyticsEmptyState(), buildInterviewSentence(), FunnelChart(), stages, StatTile(), StatTileProps, computeMostActiveMonth() (+6 more)

### Community 28 - "welcometothejungle/client.ts"
Cohesion: 0.12
Nodes (21): buildParams(), checkWttjHealth(), escapeRegExp(), fetchWttjOffers(), getWttjCredentials(), headers(), matchesKeywords(), queryJobsIndex() (+13 more)

### Community 29 - "JobStatus"
Cohesion: 0.16
Nodes (14): StatusList(), StatusListProps, statusCounts, STATUS_BADGE_CLASSNAME, STATUS_ICONS, StatusBadge(), StatusBadgeProps, JobStatus (+6 more)

### Community 30 - "digitalrecruiters/normalize.ts"
Cohesion: 0.17
Nodes (10): companyNameFromDomain(), normalizeDigitalRecruitersOffer(), parseLocationFromSlug(), fixturesDir, DigitalRecruitersJobAd, DigitalRecruitersJobAdSchema, DigitalRecruitersRawOffer, DigitalRecruitersRawOfferSchema (+2 more)

### Community 31 - "smartrecruiters/client.ts"
Cohesion: 0.21
Nodes (12): checkSmartRecruitersHealth(), CONTRACT_TITLE_PATTERNS, fetchPostingDetail(), fetchPostingsList(), fetchSmartRecruitersOffers(), headers(), matchesContractTypes(), SmartRecruitersClientOptions (+4 more)

### Community 32 - "talentsoft/types.ts"
Cohesion: 0.40
Nodes (4): TalentsoftRawOffer, TalentsoftRawOfferSchema, TalentsoftRssItem, TalentsoftRssItemSchema

### Community 33 - "Suivi de candidatures (app)"
Cohesion: 0.15
Nodes (19): Service Postgres local (docker-compose), Chiffrement at-rest (à confirmer au provisionnement), Chiffrement in-transit (TLS forcé en production), Revue explicite des secrets (JOB-118), Procédure de rotation des secrets en cas de fuite, Procédure de déploiement, Drill de restauration testé (pg_dump/pg_restore contre docker-compose), Politique de rétention des sauvegardes (à activer au provisionnement) (+11 more)

### Community 35 - "talentsoft/client.ts"
Cohesion: 0.18
Nodes (16): checkTalentsoftHealth(), decodeXmlEntities(), detectTalentsoftPlatform(), extractAllTags(), extractTag(), fetchRssItems(), fetchTalentsoftOffers(), headers() (+8 more)

### Community 36 - "html-parser.ts"
Cohesion: 0.19
Nodes (14): BLOCK_PAGE_TITLES, isBlockPageTitle(), extractJobMetadataFromHtml(), extractMetaContent(), extractTitleTag(), AGGREGATOR_HOSTNAME_FRAGMENTS, getHostname(), isAggregatorHostname() (+6 more)

### Community 38 - "interview-reminder-watcher.tsx"
Cohesion: 0.24
Nodes (4): InterviewReminderWatcher(), FakeNotification, getUpcomingInterviews(), InterviewCandidate

### Community 39 - "apple-icon.tsx"
Cohesion: 0.16
Nodes (7): contentType, size, dynamic, dynamic, contentType, size, AppIconMark()

### Community 40 - "session.ts"
Cohesion: 0.17
Nodes (10): PLATFORM_TO_TARGETS_KEY, target, CurrentUser, getCurrentUser(), mockAuth, UNAUTHENTICATED_ERROR, approveDiscoveredTargetSchema, idSchema (+2 more)

### Community 41 - "alert-dialog.tsx"
Cohesion: 0.28
Nodes (11): AlertDialog(), AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter(), AlertDialogHeader(), AlertDialogMedia() (+3 more)

### Community 42 - "discover-targets.ts"
Cohesion: 0.20
Nodes (12): companySlug(), ALL_PLATFORMS, createDiscoveredTargetIfMissing(), discoverTargets(), DiscoverTargetsOptions, DiscoverTargetsSummary, ProbeResult, PROBES (+4 more)

### Community 43 - "audit-contrast.ts"
Cohesion: 0.16
Nodes (13): audit(), contrastRatio(), css, CSS_PATH, darkFails, darkTokens, hexToRgb(), lightFails (+5 more)

### Community 44 - "ReviewQueueManager"
Cohesion: 0.20
Nodes (11): formatDate(), ReviewQueueManager(), handleClearAll(), handleIgnore(), handleImport(), navigateToCampaignSelection(), removeOffer(), toggleCampaign() (+3 more)

### Community 45 - "query-filter.ts"
Cohesion: 0.17
Nodes (16): AcceptableLocation, acceptableLocationsFromLocations(), cityFromLabel(), escapeRegExp(), haversineDistanceKm(), LocationVerdict, matchesKeywords(), normalizeCityName() (+8 more)

### Community 46 - "constants.ts"
Cohesion: 0.10
Nodes (19): CONTACT_ROLE, CONTACT_ROLE_LABELS, CONTACT_ROLE_ORDER, ContactRole, FOLLOW_UP_BADGE_CLASSNAME, FOLLOW_UP_DAYS, isJobContractType(), JOB_CONTRACT_TYPE (+11 more)

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

### Community 53 - "json-ld.ts"
Cohesion: 0.21
Nodes (14): extractEmploymentType(), extractHiringOrganizationName(), extractJobLocation(), extractJobPostingFromJsonLd(), extractLogo(), flattenJsonLdCandidates(), hasJobPostingType(), JobPostingJsonLd (+6 more)

### Community 54 - "labonnealternance/client.ts"
Cohesion: 0.21
Nodes (12): authHeaders(), buildSearchUrl(), checkLbaHealth(), fetchLbaOffers(), LBA_CONNECTOR_ID, LbaClientOptions, query, LbaGeoPointSchema (+4 more)

### Community 56 - "scripts"
Cohesion: 0.17
Nodes (12): scripts, build, dev, import-harvester-campaigns, import-rome-referentiel, lint, seed:dev, start (+4 more)

### Community 57 - "badge.tsx"
Cohesion: 0.16
Nodes (12): Badge(), badgeVariants, addValue(), addValues(), ChipInput(), commitDraft(), handleBlur(), handleKeyDown() (+4 more)

### Community 58 - "auth.ts"
Cohesion: 0.31
Nodes (6): registerUser(), { handlers, signIn, signOut, auth }, authorizeCredentials(), AuthorizedUser, hashPassword(), verifyPassword()

### Community 59 - "exportJobsCsv"
Cohesion: 0.21
Nodes (9): exportJobsCsv(), ExportCsvButton(), handleExport(), buildJobsCsv(), CSV_HEADERS, escapeCsvField(), ExportableJob, formatDate() (+1 more)

### Community 60 - "rate-limit.ts"
Cohesion: 0.18
Nodes (5): DbSlidingWindowRateLimiter, InMemorySlidingWindowRateLimiter, prisma, RateLimiter, RateLimitResult

### Community 61 - "campaign-validation.ts"
Cohesion: 0.14
Nodes (13): CONTRACT_TYPE_OPTIONS, SearchForm(), CAMPAIGN_CONTRACT_TYPE_LABELS, CAMPAIGN_CONTRACT_TYPES, CampaignContractType, campaignFieldsSchema, campaignIdSchema, campaignLocationInputSchema (+5 more)

### Community 62 - "dependencies"
Cohesion: 0.29
Nodes (7): @base-ui/react, lucide-react, next-themes, dependencies, @base-ui/react, lucide-react, next-themes

### Community 63 - "board.tsx"
Cohesion: 0.14
Nodes (11): Board(), jobs, EnrichmentPollWatcher(), computeReorderedColumn(), isJobStatus(), matchesJobQuery(), matchesSelectedTags(), job() (+3 more)

### Community 64 - "Champ "Métier recherché" Implementation Plan"
Cohesion: 0.20
Nodes (9): Champ "Métier recherché" Implementation Plan, Final Verification, Global Constraints, Task 1: Champ `metiers` — schéma Prisma et validation Zod, Task 2: Script d'import du référentiel ROME, Task 3: Recherche floue sur le référentiel, Task 4: Server Action `searchMetiers`, Task 5: Champ "Métier recherché" dans le formulaire de campagne (+1 more)

### Community 65 - "geocoding.ts"
Cohesion: 0.20
Nodes (10): mockGeocodingSuccess(), BanFeature, geocodeCity(), GeocodedCity, LocationInput, ResolvedLocation, resolveLocations(), ResolveLocationsResult (+2 more)

### Community 66 - "francetravail/normalize.ts"
Cohesion: 0.26
Nodes (8): LEGAL_SUFFIXES, normalizeCompanyName(), mapContractType(), normalizeFranceTravailOffer(), parseLieuTravail(), resolveApplyUrl(), resolveOriginSource(), fixturesDir

### Community 67 - "rome-search.ts"
Cohesion: 0.36
Nodes (6): MetierMatch, normalize(), normalizedReferentiel, searchRomeReferentiel(), trigrams(), trigramSimilarity()

### Community 68 - "package.json"
Cohesion: 0.33
Nodes (5): name, overrides, deepmerge-ts, private, version

### Community 70 - "CampaignFormDialog"
Cohesion: 0.17
Nodes (8): CampaignFormDialog(), buildPayload(), handleDelete(), locationsFromCampaign(), scheduleOptionFromCron(), smartrecruitersFromCampaign(), splitCommaList(), workdayTargetsFromCampaign()

### Community 71 - "application-heatmap.tsx"
Cohesion: 0.24
Nodes (11): ApplicationHeatmap(), formatCellTitle(), isHighContrastLevel(), legendCount(), LEVEL_3_THRESHOLDS, LEVEL_OPACITY, levelStyle(), buildHeatmapDays() (+3 more)

### Community 73 - "next-auth.d.ts"
Cohesion: 0.40
Nodes (4): JWT, next-auth, next-auth/jwt, Session

### Community 76 - "Échelle typographique et espacements (a11y, JOB-87)"
Cohesion: 0.50
Nodes (4): Échelle typographique et espacements (a11y, JOB-87), Audit de contraste AA des tokens de design (JOB-112/124), Correctif JOB-102 : BentoSection conservée (données personnalisées, pas du marketing statique), Décision produit : rôle de la page d'accueil (JOB-101)

### Community 77 - "Simplification grand public du Harvester — Implementation Plan"
Cohesion: 0.20
Nodes (9): Global Constraints, Simplification grand public du Harvester — Implementation Plan, Task 1: Composant générique `ChipInput` (JOB-147), Task 2: Brancher `ChipInput` sur le champ "Mots-clés" du formulaire de campagne (JOB-148), Task 3: Dictionnaire de libellés lisibles pour les sources/connecteurs (JOB-150), Task 4: Refondre la file de revue en liste de cartes (JOB-152), Task 5: Filtre par campagne dans la file de revue (JOB-154), Task 6: Traduire le vocabulaire technique restant en langage grand public (JOB-149) (+1 more)

### Community 81 - "normalized-offer.ts"
Cohesion: 0.12
Nodes (22): FUZZY_MATCH_THRESHOLD, isDuplicate(), isExactDuplicate(), isFuzzyDuplicate(), mergeOffers(), unionSourceRefs(), ContractType, Lifecycle (+14 more)

### Community 82 - "proxy.ts"
Cohesion: 0.32
Nodes (5): authGuard, config, PROTECTED_PREFIXES, proxy(), authHandlerCalls

### Community 83 - "layout.tsx"
Cohesion: 0.21
Nodes (7): atkinsonHyperlegible, bricolageGrotesque, geistMono, metadata, viewport, ServiceWorkerRegistration(), Toaster()

### Community 85 - "import-rome-referentiel.ts"
Cohesion: 0.38
Nodes (6): AppellationRow, CodeRomeRow, extractJson(), findEntry(), main(), OUTPUT_PATH

### Community 87 - "harvest-query.ts"
Cohesion: 0.10
Nodes (24): CampaignConfig, CampaignConfigSchema, CONTRACT_TYPE_TO_PRISMA_ENUM, LocationConfig, LocationConfigSchema, StoredCampaignConfigSchema, Connector, HarvestLocation (+16 more)

### Community 118 - "exactDedupKeyFromSource"
Cohesion: 0.20
Nodes (13): buildCanonicalUrl(), mapRemotePolicy(), normalizeWttjOffer(), fixturesDir, exactDedupKeyFromSource(), exactDedupKeyFromUrl(), sha1(), RawOffer (+5 more)

### Community 137 - "proof-stats.ts"
Cohesion: 0.26
Nodes (6): maxDuration, HarvesterProofBar(), getHarvesterProofStats(), HarvesterProofStats, getSourceLabel(), SOURCE_LABELS

### Community 138 - "Vocabulaire grand public pour la section Harvester (JOB-149, JOB-150)"
Cohesion: 0.33
Nodes (5): Contexte, Correction (2026-09-01), Lexique validé, Portée : uniquement le texte affiché, Vocabulaire grand public pour la section Harvester (JOB-149, JOB-150)

### Community 139 - "Devenir de "Cibles découvertes" pour la navigation grand public (JOB-153)"
Cohesion: 0.40
Nodes (4): Contexte, Devenir de "Cibles découvertes" pour la navigation grand public (JOB-153), Décision, Portée du changement

### Community 140 - "campaigns.isolation.integration.test.ts"
Cohesion: 0.50
Nodes (3): asA(), baseCampaignInput, createCampaignAsA()

### Community 142 - "JobDialog"
Cohesion: 0.17
Nodes (12): JobDialog(), handleAddTag(), handleDelete(), handleMarkFollowUp(), handleRemoveTag(), handleSaveContractType(), handleSaveDocuments(), handleSaveInterviewDate() (+4 more)

### Community 143 - "url.ts"
Cohesion: 0.31
Nodes (8): ALLOWED_PROTOCOLS, isDisallowedFetchTarget(), isPrivateOrLoopbackHostname(), isPrivateOrLoopbackIPv4(), normalizeUrl(), SENSITIVE_PARAMS, TRACKING_PARAMS, urlSchema

### Community 145 - "labonnealternance/normalize.ts"
Cohesion: 0.22
Nodes (9): canonicalizeUrl(), TRACKING_PARAM_PREFIXES, TRACKING_PARAMS_EXACT, mapContractType(), mapOriginSource(), normalizeLbaOffer(), parseFrenchAddress(), SELF_PARTNER_LABELS (+1 more)

### Community 146 - "query-filter.multi-connector.integration.test.ts"
Cohesion: 0.22
Nodes (6): connectorById, createdCampaignIds, fetchMock, FRANCE_TRAVAIL_ENV, NO_ENV, prisma

### Community 147 - "connector-health-list.tsx"
Cohesion: 0.25
Nodes (5): CONNECTOR_LABELS, ConnectorHealthList(), formatRelativeDate(), ConnectorBadge(), ConnectorBadgeProps

### Community 148 - "logger.ts"
Cohesion: 0.27
Nodes (4): LogFields, logger, LogLevel, EMPTY

### Community 149 - "DiscoveredTargetsManager"
Cohesion: 0.60
Nodes (6): DiscoveredTargetsManager(), handleApprove(), handleReject(), removeTarget(), withPending(), formatTarget()

### Community 150 - "recherche/page.tsx"
Cohesion: 0.27
Nodes (7): criteriaFromSearchParams(), firstParam(), RecherchePage(), SearchCriteria, getSearchableOffers(), REMOTE_POLICY_LABELS, SearchableOffersResult

### Community 152 - "contacts.ts"
Cohesion: 0.39
Nodes (6): deleteContact(), updateContact(), contactOwnerWhere(), ContactRow(), handleDelete(), handleSave()

### Community 153 - "harvest/route.ts"
Cohesion: 0.36
Nodes (4): acquireCronLock(), GET(), releaseCronLock(), harvestEnv()

### Community 154 - "harvest.test.ts"
Cohesion: 0.29
Nodes (5): __resetConnectorsHealthRateLimitsForTests(), { afterTasks }, mockAuthedAs(), mockUnauthenticated(), ALL_CONNECTORS

### Community 155 - "board-keyboard.ts"
Cohesion: 0.43
Nodes (5): handleKeyDown(), adjacentStatus(), BoardColumn, computeNextFocusedJob(), FocusDirection

### Community 156 - "probe-talentsoft.ts"
Cohesion: 0.48
Nodes (4): candidateDomains(), looksLikeTalentsoft(), probeTalentsoft(), withTimeout()

### Community 157 - "connector-health-panel.tsx"
Cohesion: 0.53
Nodes (4): getConnectorsHealth(), ConnectorHealthPanel(), handleCheck(), run

### Community 158 - "company-avatar.tsx"
Cohesion: 0.47
Nodes (4): AvatarJob, CompanyAvatar(), getInitial(), base

### Community 159 - "workday/normalize.test.ts"
Cohesion: 0.50
Nodes (4): fixturesDir, loadFixture(), loadRawOfferPayload(), target

## Knowledge Gaps
- **457 isolated node(s):** `baseCampaignInput`, `geocodedLille`, `validInput`, `PLATFORM_TO_TARGETS_KEY`, `{ afterTasks }` (+452 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **57 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `bento-card.tsx`, `application-heatmap.tsx`, `utils.ts`, `job-card.tsx`, `exportJobsCsv`, `alert-dialog.tsx`, `review/page.tsx`, `connector-health-list.tsx`, `tabs.tsx`, `button.tsx`, `badge.tsx`, `job-dialog.tsx`, `analytics/page.tsx`, `JobStatus`, `company-avatar.tsx`, `board.tsx`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Why does `logger` connect `logger.ts` to `geocoding.ts`, `talentsoft/client.ts`, `discover-targets.ts`, `HarvestQuery`, `_shared.ts`, `fetch-strategy.ts`, `harvest.ts`, `workday/client.ts`, `rate-limited-fetch.ts`, `recherche/page.tsx`, `harvest-query.ts`, `harvest/route.ts`, `harvest.test.ts`, `welcometothejungle/client.ts`, `smartrecruiters/client.ts`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `prisma` connect `prisma.ts` to `auth-actions.ts`, `requireUser`, `auth.ts`, `session.ts`, `proof-stats.ts`, `validation.ts`, `campaigns.isolation.integration.test.ts`, `review/page.tsx`, `_shared.ts`, `harvest.ts`, `campaigns.ts`, `recherche/page.tsx`, `contacts.ts`, `harvest/route.ts`, `harvest.test.ts`, `analytics/page.tsx`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Are the 11 inferred relationships involving `requireUser()` (e.g. with `mockAuthedAs()` and `mockUnauthenticated()`) actually correct?**
  _`requireUser()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **What connects `baseCampaignInput`, `geocodedLille`, `validInput` to the rest of the system?**
  _457 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `bento-card.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09047619047619047 - nodes in this community are weakly interconnected._
- **Should `francetravail/client.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._