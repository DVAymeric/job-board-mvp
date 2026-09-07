# Graph Report - job-board-mvp  (2026-09-07)

## Corpus Check
- 426 files · ~237,611 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1703 nodes · 3886 edges · 154 communities (97 shown, 57 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.75)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0fcd9826`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- bento-card.tsx
- campaign-config.ts
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
- digitalrecruiters/normalize.ts
- compilerOptions
- _shared.ts
- logger.ts
- cn
- harvest.ts
- workday/client.ts
- campaigns.ts
- utils.ts
- rate-limited-fetch.ts
- talentsoft/normalize.ts
- components.json
- job-dialog.tsx
- analytics/page.tsx
- welcometothejungle/client.ts
- constants.ts
- digitalrecruiters/client.ts
- smartrecruiters/client.ts
- talentsoft/types.ts
- Suivi de candidatures (app)
- @dnd-kit/utilities
- talentsoft/client.ts
- html-parser.ts
- @dnd-kit/core
- interview-reminder-watcher.tsx
- apple-icon.tsx
- requireUser
- alert-dialog.tsx
- discover-targets.ts
- audit-contrast.ts
- connector-health-list.tsx
- query-filter.ts
- salary.ts
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
- lib/csv-export.ts
- InMemorySlidingWindowRateLimiter
- campaign-validation.ts
- dependencies
- Board
- Champ "Métier recherché" Implementation Plan
- geocoding.ts
- francetravail/normalize.ts
- rome-search.ts
- package.json
- harvester-campaigns.spec.ts
- campaign-form-dialog.tsx
- deleteAccount
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
- orchestrator.ts
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
- welcometothejungle/normalize.ts
- @types/react
- vite-tsconfig-paths
- vitest
- @vitest/coverage-v8
- postcss.config.mjs
- vercel.json
- { GET, POST }
- Bloc de règles Next.js agent (auto-régénéré par next dev)
- Procédure de rollback (code applicatif + schéma de base)
- hero-section.tsx
- Vocabulaire grand public pour la section Harvester (JOB-149, JOB-150)
- Devenir de "Cibles découvertes" pour la navigation grand public (JOB-153)
- campaigns.isolation.integration.test.ts
- page-header.tsx
- db-security.ts
- url.ts
- typescript
- labonnealternance/normalize.ts
- query-filter.multi-connector.integration.test.ts
- orchestrator.integration.test.ts
- url-check-bar.tsx
- DiscoveredTargetsManager
- recherche/page.tsx
- discover-targets.integration.test.ts
- CampaignsManager
- @base-ui/react

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
10. `logger` - 23 edges

## Surprising Connections (you probably didn't know these)
- `mockAuthedAs()` --indirect_call--> `requireUser()`  [INFERRED]
  app/actions/campaigns.test.ts → lib/auth/session.ts
- `mockUnauthenticated()` --indirect_call--> `requireUser()`  [INFERRED]
  app/actions/campaigns.test.ts → lib/auth/session.ts
- `mockAuthedAs()` --indirect_call--> `requireUser()`  [INFERRED]
  app/actions/harvest.test.ts → lib/auth/session.ts
- `mockUnauthenticated()` --indirect_call--> `requireUser()`  [INFERRED]
  app/actions/harvest.test.ts → lib/auth/session.ts
- `Échelle typographique et espacements (a11y, JOB-87)` --semantically_similar_to--> `Audit de contraste AA des tokens de design (JOB-112/124)`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/contrast-audit.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Sondes de découverte de cibles connecteurs (Workday/SmartRecruiters/Talentsoft/DigitalRecruiters) orchestrées par discoverTargets** — docs_superpowers_plans_20260830_decouverte_probeworkday, docs_superpowers_plans_20260830_decouverte_probesmartrecruiters, docs_superpowers_plans_20260830_decouverte_probetalentsoft, docs_superpowers_plans_20260830_decouverte_probedigitalrecruiters, docs_superpowers_plans_20260830_decouverte_discovertargets [EXTRACTED 1.00]
- **Fusion des schémas Harvester → Prisma : Campaign, HarvestedOffer, ConnectorRun** — docs_superpowers_plans_20260818_job40_campaign_model, docs_superpowers_plans_20260818_job40_harvestedoffer_model, docs_superpowers_plans_20260818_job40_connectorrun_model [EXTRACTED 1.00]
- **Portage progressif de job-harvester vers job-board-mvp** — job_harvester_origin_repo, docs_decision_pas_de_serveur_hono_decision, docs_decision_scheduling_harvester_decision, docs_superpowers_plans_20260818_job40_campaign_model, docs_superpowers_plans_20260830_decouverte_discovertargets [INFERRED 0.85]

## Communities (154 total, 57 thin omitted)

### Community 0 - "bento-card.tsx"
Cohesion: 0.09
Nodes (21): Loading(), FEATURES, TarifsPage(), AboutCard(), CampaignsCard(), CampaignsCardProps, HarvesterOverview(), HarvesterOverviewProps (+13 more)

### Community 1 - "campaign-config.ts"
Cohesion: 0.13
Nodes (16): CampaignConfig, CampaignConfigSchema, CampaignsFileSchema, CONTRACT_TYPE_TO_PRISMA_ENUM, LocationConfig, LocationConfigSchema, mapYamlCampaignToCreateInput(), StoredCampaignConfigSchema (+8 more)

### Community 2 - "probe-talentsoft.ts"
Cohesion: 0.23
Nodes (9): candidateDomains(), looksLikeTalentsoft(), probeTalentsoft(), withTimeout(), getRobots(), isAllowedByRobots(), Robots, robotsCache (+1 more)

### Community 3 - "francetravail/client.ts"
Cohesion: 0.11
Nodes (25): ALTERNANCE_ONLY_TYPES, authHeaders(), buildSearchUrl(), CachedToken, checkFranceTravailHealth(), fetchFranceTravailOffers(), FRANCE_TRAVAIL_CONNECTOR_ID, FranceTravailClientOptions (+17 more)

### Community 4 - "auth-actions.ts"
Cohesion: 0.31
Nodes (6): AuthFormState, registerAction(), registerSchema, registerUser(), initialState, RegisterForm()

### Community 5 - "logActionError"
Cohesion: 0.13
Nodes (38): addContact(), deleteContact(), updateContact(), updateJobContractType(), updateJobDetails(), updateJobDocuments(), updateJobInterviewDate(), updateJobNotes() (+30 more)

### Community 6 - "discoverTargets — orchestrateur de découverte de cibles connecteurs"
Cohesion: 0.07
Nodes (35): Décision : pas de serveur HTTP Hono pour Harvester (JOB-48), Simplification actée : une cadence cron globale plutôt qu'une par campagne, Décision : déclenchement planifié via Vercel Cron (JOB-52), Convention codes ROME pour les campagnes de collecte (JOB-71), Décision : post-filtre centralisé contrat/mots-clés/localisation (JOB-73), resolveLocationVerdict — cascade de vérification de localisation à 3 niveaux, Isolation multi-tenant Harvester (scoping userId), Rate limiting du déclenchement de collecte (prévu pour les tickets 9/14) (+27 more)

### Community 7 - "prisma.ts"
Cohesion: 0.12
Nodes (15): exportJobsCsv(), asA(), createJobAsA(), afterCallbacks, CurrentUser, getCurrentUser(), mockAuth, UNAUTHENTICATED_ERROR (+7 more)

### Community 8 - "review-queue-manager.tsx"
Cohesion: 0.15
Nodes (13): CONTRACT_TYPE_OPTIONS, SearchForm(), Input(), SelectContent(), SelectItem(), SelectTrigger(), SelectValue(), Skeleton() (+5 more)

### Community 9 - "board.tsx"
Cohesion: 0.13
Nodes (10): loginAction(), initialState, LoginForm(), Column(), EnrichmentPollWatcher(), ExportCsvButton(), handleExport(), CampaignRow() (+2 more)

### Community 10 - "user-agent.ts"
Cohesion: 0.23
Nodes (6): probeDigitalRecruiters(), probeSmartRecruiters(), DC_CANDIDATES, DiscoveredWorkdayTarget, probeWorkday(), USER_AGENT

### Community 11 - "validation.ts"
Cohesion: 0.10
Nodes (31): CONTACT_ROLE, addContactSchema, addTagToJobSchema, checkJobUrlSchema, COMPANY_NAME_MAX_LENGTH, companyNameSchema, contactLinkedinUrlSchema, contactRoleSchema (+23 more)

### Community 12 - "board-critical-path.spec.ts"
Cohesion: 0.07
Nodes (12): prisma, prisma, stamp, FIXTURE_HTML, FixtureServer, startFixtureServer(), prisma, stamp (+4 more)

### Community 13 - "harvest-query.ts"
Cohesion: 0.18
Nodes (18): Connector, ConnectorContext, digitalRecruitersConnector, francetravailConnector, labonnealternanceConnector, smartrecruitersConnector, talentsoftConnector, ENV_KEYS (+10 more)

### Community 14 - "digitalrecruiters/normalize.ts"
Cohesion: 0.15
Nodes (13): canonicalizeUrl(), TRACKING_PARAM_PREFIXES, TRACKING_PARAMS_EXACT, companyNameFromDomain(), normalizeDigitalRecruitersOffer(), parseLocationFromSlug(), fixturesDir, normalizeSmartRecruitersOffer() (+5 more)

### Community 15 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 16 - "_shared.ts"
Cohesion: 0.15
Nodes (20): CHECK_JOB_URL_RATE_LIMIT, checkJobUrl(), CREATE_JOB_RATE_LIMIT, createJob(), enrichJob(), KnownJobFields, fetchCompanyLogo(), fetchJobMetadata() (+12 more)

### Community 17 - "logger.ts"
Cohesion: 0.16
Nodes (16): LogFields, logger, LogLevel, ANTI_BOT_STATUS_CODES, fetchMetadataViaHttp(), REQUEST_HEADERS, scrapeJobMetadata(), EMPTY (+8 more)

### Community 18 - "cn"
Cohesion: 0.08
Nodes (32): logoutAction(), LINKS, MobileMenu(), Nav(), noopSubscribe(), session, ThemeToggle(), useMounted() (+24 more)

### Community 19 - "harvest.ts"
Cohesion: 0.11
Nodes (18): clearHarvestedOffers(), CONNECTORS_HEALTH_GLOBAL_RATE_LIMIT, CONNECTORS_HEALTH_RATE_LIMIT, ignoreHarvestedOffer(), importHarvestedOffer(), __resetConnectorsHealthRateLimitsForTests(), { afterTasks }, mockAuthedAs() (+10 more)

### Community 20 - "workday/client.ts"
Cohesion: 0.13
Nodes (21): buildSearchTerms(), checkWorkdayHealth(), CONTRACT_SEARCH_TERMS, cxsBaseUrl(), fetchJobDetail(), fetchJobList(), fetchWorkdayOffers(), headers() (+13 more)

### Community 21 - "campaigns.ts"
Cohesion: 0.17
Nodes (16): createCampaign(), deleteCampaign(), listCampaigns(), reorderCampaigns(), searchMetiers(), geocodedLille, mockAuthedAs(), mockUnauthenticated() (+8 more)

### Community 22 - "utils.ts"
Cohesion: 0.16
Nodes (13): AvatarJob, CompanyAvatar(), getInitial(), base, JobResult, JobResultRow(), baseResult, EMPTY_CRITERIA (+5 more)

### Community 23 - "rate-limited-fetch.ts"
Cohesion: 0.26
Nodes (6): createRateLimitedFetch(), DEFAULT_RETRY_DELAYS_MS, extractHostname(), RateLimitedFetchOptions, sleep(), TokenBucket

### Community 24 - "talentsoft/normalize.ts"
Cohesion: 0.18
Nodes (16): companyNameFromDomain(), findAddressCategory(), normalizeTalentsoftOffer(), parseAddress(), stripReferencePrefix(), ADR-0004, normalizeWorkdayOffer(), fixturesDir (+8 more)

### Community 25 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 26 - "job-dialog.tsx"
Cohesion: 0.13
Nodes (13): ContactsSection(), handleAdd(), StatusTimeline(), Dialog(), DialogContent(), DialogDescription(), DialogFooter(), DialogHeader() (+5 more)

### Community 27 - "analytics/page.tsx"
Cohesion: 0.10
Nodes (24): AnalyticsPage(), AnalyticsEmptyState(), ApplicationHeatmap(), formatCellTitle(), isHighContrastLevel(), legendCount(), LEVEL_3_THRESHOLDS, LEVEL_OPACITY (+16 more)

### Community 28 - "welcometothejungle/client.ts"
Cohesion: 0.14
Nodes (17): buildParams(), checkWttjHealth(), escapeRegExp(), fetchWttjOffers(), getWttjCredentials(), headers(), matchesKeywords(), queryJobsIndex() (+9 more)

### Community 29 - "constants.ts"
Cohesion: 0.08
Nodes (30): StatusList(), StatusListProps, statusCounts, getDisplayTitle(), JobCard(), handleDelete(), STATUS_DATE_LABEL, baseJob (+22 more)

### Community 30 - "digitalrecruiters/client.ts"
Cohesion: 0.16
Nodes (13): checkDigitalRecruitersHealth(), DIGITALRECRUITERS_CONNECTOR_ID, DigitalRecruitersClientOptions, fetchDigitalRecruitersOffers(), fetchJobAdsPage(), headers(), query, DigitalRecruitersJobAd (+5 more)

### Community 31 - "smartrecruiters/client.ts"
Cohesion: 0.16
Nodes (16): checkSmartRecruitersHealth(), CONTRACT_TITLE_PATTERNS, fetchPostingDetail(), fetchPostingsList(), fetchSmartRecruitersOffers(), headers(), matchesContractTypes(), SMARTRECRUITERS_CONNECTOR_ID (+8 more)

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

### Community 40 - "requireUser"
Cohesion: 0.16
Nodes (15): mockAuthedAs(), approveDiscoveredTarget(), PLATFORM_TO_TARGETS_KEY, rejectDiscoveredTarget(), mockAuthedAs(), mockAuthedAs(), mockAuthedAs(), mockAuthedAs() (+7 more)

### Community 41 - "alert-dialog.tsx"
Cohesion: 0.28
Nodes (11): AlertDialog(), AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter(), AlertDialogHeader(), AlertDialogMedia() (+3 more)

### Community 42 - "discover-targets.ts"
Cohesion: 0.20
Nodes (12): companySlug(), ALL_PLATFORMS, createDiscoveredTargetIfMissing(), discoverTargets(), DiscoverTargetsOptions, DiscoverTargetsSummary, ProbeResult, PROBES (+4 more)

### Community 43 - "audit-contrast.ts"
Cohesion: 0.16
Nodes (13): audit(), contrastRatio(), css, CSS_PATH, darkFails, darkTokens, hexToRgb(), lightFails (+5 more)

### Community 44 - "connector-health-list.tsx"
Cohesion: 0.06
Nodes (28): getConnectorsHealth(), maxDuration, StatTile(), StatTileProps, CONNECTOR_LABELS, ConnectorHealthList(), formatRelativeDate(), ConnectorHealthPanel() (+20 more)

### Community 45 - "query-filter.ts"
Cohesion: 0.18
Nodes (15): AcceptableLocation, cityFromLabel(), departmentFromLabel(), escapeRegExp(), haversineDistanceKm(), LocationVerdict, matchesKeywords(), normalizeCityName() (+7 more)

### Community 46 - "salary.ts"
Cohesion: 0.43
Nodes (5): SalaryType, WORKING_DAYS_PER_YEAR, formatSalary(), formatThousands(), normalizeAnnualSalary()

### Community 47 - "review/page.tsx"
Cohesion: 0.31
Nodes (7): HarvesterCampaignsPage(), HarvesterPage(), HarvesterReviewPage(), HarvesterTabs(), HarvesterTabsProps, TABS, getPendingOfferCount()

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
Cohesion: 0.15
Nodes (15): authHeaders(), buildSearchUrl(), checkLbaHealth(), fetchLbaOffers(), LBA_CONNECTOR_ID, LbaClientOptions, query, LbaGeoPointSchema (+7 more)

### Community 56 - "scripts"
Cohesion: 0.17
Nodes (12): scripts, build, dev, import-harvester-campaigns, import-rome-referentiel, lint, seed:dev, start (+4 more)

### Community 57 - "badge.tsx"
Cohesion: 0.16
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
Cohesion: 0.15
Nodes (12): CAMPAIGN_CONTRACT_TYPES, CampaignContractType, campaignFieldsSchema, campaignIdSchema, campaignLocationInputSchema, createCampaignSchema, deleteCampaignSchema, reorderCampaignsSchema (+4 more)

### Community 62 - "dependencies"
Cohesion: 0.29
Nodes (7): cheerio, lucide-react, next-themes, dependencies, cheerio, lucide-react, next-themes

### Community 63 - "Board"
Cohesion: 0.13
Nodes (12): Board(), handleKeyDown(), adjacentStatus(), BoardColumn, computeNextFocusedJob(), FocusDirection, computeReorderedColumn(), isJobStatus() (+4 more)

### Community 64 - "Champ "Métier recherché" Implementation Plan"
Cohesion: 0.20
Nodes (9): Champ "Métier recherché" Implementation Plan, Final Verification, Global Constraints, Task 1: Champ `metiers` — schéma Prisma et validation Zod, Task 2: Script d'import du référentiel ROME, Task 3: Recherche floue sur le référentiel, Task 4: Server Action `searchMetiers`, Task 5: Champ "Métier recherché" dans le formulaire de campagne (+1 more)

### Community 65 - "geocoding.ts"
Cohesion: 0.20
Nodes (10): mockGeocodingSuccess(), BanFeature, geocodeCity(), GeocodedCity, LocationInput, ResolvedLocation, resolveLocations(), ResolveLocationsResult (+2 more)

### Community 66 - "francetravail/normalize.ts"
Cohesion: 0.36
Nodes (6): mapContractType(), normalizeFranceTravailOffer(), parseLieuTravail(), resolveApplyUrl(), resolveOriginSource(), fixturesDir

### Community 67 - "rome-search.ts"
Cohesion: 0.36
Nodes (6): MetierMatch, normalize(), normalizedReferentiel, searchRomeReferentiel(), trigrams(), trigramSimilarity()

### Community 68 - "package.json"
Cohesion: 0.33
Nodes (5): name, overrides, deepmerge-ts, private, version

### Community 70 - "campaign-form-dialog.tsx"
Cohesion: 0.13
Nodes (14): CampaignConfigJsonSchema, CampaignFormDialog(), buildPayload(), handleDelete(), EMPTY_LOCATION, LocationInput, locationsFromCampaign(), SCHEDULE_OPTIONS (+6 more)

### Community 71 - "deleteAccount"
Cohesion: 0.33
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

### Community 81 - "normalized-offer.ts"
Cohesion: 0.11
Nodes (24): FUZZY_MATCH_THRESHOLD, isDuplicate(), isExactDuplicate(), isFuzzyDuplicate(), mergeOffers(), makeOffer(), unionSourceRefs(), ContractType (+16 more)

### Community 82 - "proxy.ts"
Cohesion: 0.32
Nodes (5): authGuard, config, PROTECTED_PREFIXES, proxy(), authHandlerCalls

### Community 83 - "layout.tsx"
Cohesion: 0.21
Nodes (7): atkinsonHyperlegible, bricolageGrotesque, geistMono, metadata, viewport, ServiceWorkerRegistration(), Toaster()

### Community 85 - "import-rome-referentiel.ts"
Cohesion: 0.38
Nodes (6): AppellationRow, CodeRomeRow, extractJson(), findEntry(), main(), OUTPUT_PATH

### Community 87 - "orchestrator.ts"
Cohesion: 0.17
Nodes (15): acquireCronLock(), GET(), releaseCronLock(), harvestEnv(), harvestedOfferToNormalizedOffer(), buildHarvestQueryForLocation(), CampaignConfigJsonSchema, CONTRACT_TYPE_FROM_PRISMA (+7 more)

### Community 118 - "welcometothejungle/normalize.ts"
Cohesion: 0.26
Nodes (7): LEGAL_SUFFIXES, normalizeCompanyName(), buildCanonicalUrl(), mapRemotePolicy(), normalizeWttjOffer(), fixturesDir, RemotePolicy

### Community 138 - "Vocabulaire grand public pour la section Harvester (JOB-149, JOB-150)"
Cohesion: 0.33
Nodes (5): Contexte, Correction (2026-09-01), Lexique validé, Portée : uniquement le texte affiché, Vocabulaire grand public pour la section Harvester (JOB-149, JOB-150)

### Community 139 - "Devenir de "Cibles découvertes" pour la navigation grand public (JOB-153)"
Cohesion: 0.40
Nodes (4): Contexte, Devenir de "Cibles découvertes" pour la navigation grand public (JOB-153), Décision, Portée du changement

### Community 140 - "campaigns.isolation.integration.test.ts"
Cohesion: 0.50
Nodes (3): asA(), baseCampaignInput, createCampaignAsA()

### Community 141 - "page-header.tsx"
Cohesion: 0.31
Nodes (4): Loading(), RECHERCHE_SKELETON_ROW_COUNT, PageHeader(), PageHeaderProps

### Community 143 - "url.ts"
Cohesion: 0.31
Nodes (8): ALLOWED_PROTOCOLS, isDisallowedFetchTarget(), isPrivateOrLoopbackHostname(), isPrivateOrLoopbackIPv4(), normalizeUrl(), SENSITIVE_PARAMS, TRACKING_PARAMS, urlSchema

### Community 145 - "labonnealternance/normalize.ts"
Cohesion: 0.33
Nodes (6): mapContractType(), mapOriginSource(), normalizeLbaOffer(), parseFrenchAddress(), SELF_PARTNER_LABELS, fixturesDir

### Community 146 - "query-filter.multi-connector.integration.test.ts"
Cohesion: 0.22
Nodes (6): connectorById, createdCampaignIds, fetchMock, FRANCE_TRAVAIL_ENV, NO_ENV, prisma

### Community 147 - "orchestrator.integration.test.ts"
Cohesion: 0.29
Nodes (4): createdCampaignIds, makeOffer(), normalize(), prisma

### Community 148 - "url-check-bar.tsx"
Cohesion: 0.33
Nodes (3): UrlCheckBar(), UrlCheckBarProps, UrlCheckResultTag

### Community 149 - "DiscoveredTargetsManager"
Cohesion: 0.60
Nodes (6): DiscoveredTargetsManager(), handleApprove(), handleReject(), removeTarget(), withPending(), formatTarget()

### Community 150 - "recherche/page.tsx"
Cohesion: 0.70
Nodes (4): criteriaFromSearchParams(), firstParam(), RecherchePage(), getSearchableOffers()

### Community 152 - "CampaignsManager"
Cohesion: 0.50
Nodes (3): CampaignsManager(), handleDragEnd(), handleTrigger()

## Knowledge Gaps
- **457 isolated node(s):** `baseCampaignInput`, `geocodedLille`, `validInput`, `PLATFORM_TO_TARGETS_KEY`, `{ afterTasks }` (+452 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **57 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `bento-card.tsx`, `review-queue-manager.tsx`, `board.tsx`, `alert-dialog.tsx`, `connector-health-list.tsx`, `review/page.tsx`, `url-check-bar.tsx`, `tabs.tsx`, `utils.ts`, `badge.tsx`, `job-dialog.tsx`, `analytics/page.tsx`, `constants.ts`, `Board`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Why does `logger` connect `logger.ts` to `geocoding.ts`, `talentsoft/client.ts`, `prisma.ts`, `discover-targets.ts`, `_shared.ts`, `harvest.ts`, `workday/client.ts`, `orchestrator.ts`, `campaign-validation.ts`, `digitalrecruiters/client.ts`, `smartrecruiters/client.ts`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `prisma` connect `prisma.ts` to `auth-actions.ts`, `logActionError`, `requireUser`, `campaigns.isolation.integration.test.ts`, `page-header.tsx`, `connector-health-list.tsx`, `review/page.tsx`, `_shared.ts`, `harvest.ts`, `campaigns.ts`, `orchestrator.ts`, `auth.ts`, `analytics/page.tsx`, `campaign-validation.ts`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Are the 11 inferred relationships involving `requireUser()` (e.g. with `mockAuthedAs()` and `mockUnauthenticated()`) actually correct?**
  _`requireUser()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **What connects `baseCampaignInput`, `geocodedLille`, `validInput` to the rest of the system?**
  _457 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `bento-card.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09047619047619047 - nodes in this community are weakly interconnected._
- **Should `campaign-config.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12857142857142856 - nodes in this community are weakly interconnected._