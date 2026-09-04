# Graph Report - job-board-mvp  (2026-09-02)

## Corpus Check
- 417 files · ~152,301 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1658 nodes · 3809 edges · 131 communities (75 shown, 56 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.75)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `86d48f69`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- bento-card.tsx
- orchestrator.ts
- probe-talentsoft.ts
- francetravail/client.ts
- auth-actions.ts
- logActionError
- discoverTargets — orchestrateur de découverte de cibles connecteurs
- prisma.ts
- review-queue-manager.tsx
- url-check-bar.tsx
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
- requireUser
- button.tsx
- rate-limited-fetch.ts
- constants.ts
- components.json
- job-dialog.tsx
- analytics/page.tsx
- welcometothejungle/client.ts
- JobStatus
- digitalrecruiters/client.ts
- smartrecruiters/client.ts
- talentsoft/types.ts
- Suivi de candidatures (app)
- @dnd-kit/utilities
- talentsoft/client.ts
- application-heatmap.tsx
- @dnd-kit/core
- interview-reminder-watcher.tsx
- apple-icon.tsx
- jobs-create.ts
- alert-dialog.tsx
- discover-targets.ts
- audit-contrast.ts
- connector-health-list.tsx
- session.ts
- salary.ts
- discovery.ts
- ics.ts
- board-reorder.ts
- devDependencies
- class-variance-authority
- tabs.tsx
- analytics-empty-state.tsx
- labonnealternance/client.ts
- @axe-core/playwright
- scripts
- badge.tsx
- @base-ui/react
- lib/csv-export.ts
- InMemorySlidingWindowRateLimiter
- dependencies
- board.tsx
- contacts.ts
- francetravail/normalize.ts
- package.json
- harvester-campaigns.spec.ts
- campaign-form-dialog.tsx
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
- clsx
- @dnd-kit/sortable
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
- tsx
- @types/react
- vite-tsconfig-paths
- vitest
- @vitest/coverage-v8
- postcss.config.mjs
- vercel.json
- { GET, POST }
- Bloc de règles Next.js agent (auto-régénéré par next dev)
- Procédure de rollback (code applicatif + schéma de base)
- Vocabulaire grand public pour la section Harvester (JOB-149, JOB-150)
- Devenir de "Cibles découvertes" pour la navigation grand public (JOB-153)

## God Nodes (most connected - your core abstractions)
1. `cn()` - 95 edges
2. `requireUser()` - 65 edges
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
  app/actions/discovery.test.ts → lib/auth/session.ts
- `mockAuthedAs()` --indirect_call--> `requireUser()`  [INFERRED]
  app/actions/harvest.test.ts → lib/auth/session.ts
- `mockUnauthenticated()` --indirect_call--> `requireUser()`  [INFERRED]
  app/actions/harvest.test.ts → lib/auth/session.ts
- `mockAuthedAs()` --indirect_call--> `requireUser()`  [INFERRED]
  app/actions/jobs-create.test.ts → lib/auth/session.ts
- `Échelle typographique et espacements (a11y, JOB-87)` --semantically_similar_to--> `Audit de contraste AA des tokens de design (JOB-112/124)`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/contrast-audit.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Sondes de découverte de cibles connecteurs (Workday/SmartRecruiters/Talentsoft/DigitalRecruiters) orchestrées par discoverTargets** — docs_superpowers_plans_20260830_decouverte_probeworkday, docs_superpowers_plans_20260830_decouverte_probesmartrecruiters, docs_superpowers_plans_20260830_decouverte_probetalentsoft, docs_superpowers_plans_20260830_decouverte_probedigitalrecruiters, docs_superpowers_plans_20260830_decouverte_discovertargets [EXTRACTED 1.00]
- **Fusion des schémas Harvester → Prisma : Campaign, HarvestedOffer, ConnectorRun** — docs_superpowers_plans_20260818_job40_campaign_model, docs_superpowers_plans_20260818_job40_harvestedoffer_model, docs_superpowers_plans_20260818_job40_connectorrun_model [EXTRACTED 1.00]
- **Portage progressif de job-harvester vers job-board-mvp** — job_harvester_origin_repo, docs_decision_pas_de_serveur_hono_decision, docs_decision_scheduling_harvester_decision, docs_superpowers_plans_20260818_job40_campaign_model, docs_superpowers_plans_20260830_decouverte_discovertargets [INFERRED 0.85]

## Communities (131 total, 56 thin omitted)

### Community 0 - "bento-card.tsx"
Cohesion: 0.05
Nodes (43): Loading(), HarvesterCampaignsPage(), HarvesterPage(), HarvesterReviewPage(), Loading(), RECHERCHE_SKELETON_ROW_COUNT, criteriaFromSearchParams(), firstParam() (+35 more)

### Community 1 - "orchestrator.ts"
Cohesion: 0.05
Nodes (51): GET(), CampaignConfig, CampaignConfigSchema, CampaignsFileSchema, CONTRACT_TYPE_TO_PRISMA_ENUM, LocationConfig, LocationConfigSchema, mapYamlCampaignToCreateInput() (+43 more)

### Community 2 - "probe-talentsoft.ts"
Cohesion: 0.23
Nodes (9): candidateDomains(), looksLikeTalentsoft(), probeTalentsoft(), withTimeout(), getRobots(), isAllowedByRobots(), Robots, robotsCache (+1 more)

### Community 3 - "francetravail/client.ts"
Cohesion: 0.08
Nodes (30): ALTERNANCE_ONLY_TYPES, authHeaders(), buildSearchUrl(), CachedToken, fetchFranceTravailOffers(), FranceTravailClientOptions, getAccessToken(), inFlightTokenRequests (+22 more)

### Community 4 - "auth-actions.ts"
Cohesion: 0.06
Nodes (30): AuthFormState, deleteAccount(), loginAction(), registerAction(), registerSchema, registerUser(), atkinsonHyperlegible, bricolageGrotesque (+22 more)

### Community 5 - "logActionError"
Cohesion: 0.18
Nodes (33): addContact(), clearHarvestedOffers(), ignoreHarvestedOffer(), importHarvestedOffer(), updateJobContractType(), updateJobDetails(), updateJobDocuments(), updateJobInterviewDate() (+25 more)

### Community 6 - "discoverTargets — orchestrateur de découverte de cibles connecteurs"
Cohesion: 0.07
Nodes (35): Décision : pas de serveur HTTP Hono pour Harvester (JOB-48), Simplification actée : une cadence cron globale plutôt qu'une par campagne, Décision : déclenchement planifié via Vercel Cron (JOB-52), Convention codes ROME pour les campagnes de collecte (JOB-71), Décision : post-filtre centralisé contrat/mots-clés/localisation (JOB-73), resolveLocationVerdict — cascade de vérification de localisation à 3 niveaux, Isolation multi-tenant Harvester (scoping userId), Rate limiting du déclenchement de collecte (prévu pour les tickets 9/14) (+27 more)

### Community 7 - "prisma.ts"
Cohesion: 0.11
Nodes (14): asA(), baseCampaignInput, createCampaignAsA(), exportJobsCsv(), handleExport(), assertDatabaseUrlIsEncrypted(), TLS_INDICATORS, can() (+6 more)

### Community 8 - "review-queue-manager.tsx"
Cohesion: 0.13
Nodes (15): CONTRACT_TYPE_OPTIONS, SearchForm(), Input(), SelectContent(), SelectGroup(), SelectItem(), SelectLabel(), SelectScrollDownButton() (+7 more)

### Community 9 - "url-check-bar.tsx"
Cohesion: 0.33
Nodes (3): UrlCheckBar(), UrlCheckBarProps, UrlCheckResultTag

### Community 10 - "user-agent.ts"
Cohesion: 0.23
Nodes (6): probeDigitalRecruiters(), probeSmartRecruiters(), DC_CANDIDATES, DiscoveredWorkdayTarget, probeWorkday(), USER_AGENT

### Community 11 - "validation.ts"
Cohesion: 0.08
Nodes (38): ALLOWED_PROTOCOLS, isDisallowedFetchTarget(), isPrivateOrLoopbackHostname(), isPrivateOrLoopbackIPv4(), normalizeUrl(), SENSITIVE_PARAMS, TRACKING_PARAMS, addContactSchema (+30 more)

### Community 12 - "board-critical-path.spec.ts"
Cohesion: 0.07
Nodes (12): prisma, prisma, stamp, FIXTURE_HTML, FixtureServer, startFixtureServer(), prisma, stamp (+4 more)

### Community 13 - "harvest-query.ts"
Cohesion: 0.19
Nodes (17): Connector, ConnectorContext, digitalRecruitersConnector, francetravailConnector, labonnealternanceConnector, smartrecruitersConnector, talentsoftConnector, ENV_KEYS (+9 more)

### Community 14 - "talentsoft/normalize.ts"
Cohesion: 0.09
Nodes (35): companyNameFromDomain(), normalizeDigitalRecruitersOffer(), parseLocationFromSlug(), fixturesDir, normalizeSmartRecruitersOffer(), fixturesDir, loadFixture(), loadRawOfferPayload() (+27 more)

### Community 15 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 16 - "_shared.ts"
Cohesion: 0.24
Nodes (11): afterCallbacks, mockAuthedAs(), fetchCompanyLogo(), fetchJobMetadata(), logoUrlResolves(), resolveCompanyLogo(), resolveScrapedMetadata(), buildBrandfetchLogoUrl() (+3 more)

### Community 17 - "logger.ts"
Cohesion: 0.05
Nodes (50): BanFeature, geocodeCity(), GeocodedCity, LocationInput, ResolvedLocation, ResolveLocationsResult, LogFields, logger (+42 more)

### Community 18 - "cn"
Cohesion: 0.10
Nodes (27): logoutAction(), LINKS, MobileMenu(), Nav(), noopSubscribe(), session, ThemeToggle(), useMounted() (+19 more)

### Community 19 - "harvest.ts"
Cohesion: 0.11
Nodes (16): CONNECTORS_HEALTH_GLOBAL_RATE_LIMIT, CONNECTORS_HEALTH_RATE_LIMIT, getConnectorsHealth(), __resetConnectorsHealthRateLimitsForTests(), { afterTasks }, mockAuthedAs(), mockUnauthenticated(), TRIGGER_COLLECTION_RATE_LIMIT (+8 more)

### Community 20 - "workday/client.ts"
Cohesion: 0.13
Nodes (21): buildSearchTerms(), checkWorkdayHealth(), CONTRACT_SEARCH_TERMS, cxsBaseUrl(), fetchJobDetail(), fetchJobList(), fetchWorkdayOffers(), headers() (+13 more)

### Community 21 - "requireUser"
Cohesion: 0.11
Nodes (28): createCampaign(), deleteCampaign(), listCampaigns(), reorderCampaigns(), geocodedLille, mockAuthedAs(), mockGeocodingSuccess(), mockUnauthenticated() (+20 more)

### Community 22 - "button.tsx"
Cohesion: 0.13
Nodes (14): AvatarJob, CompanyAvatar(), getInitial(), base, ExportCsvButton(), JobResult, JobResultRow(), baseResult (+6 more)

### Community 23 - "rate-limited-fetch.ts"
Cohesion: 0.26
Nodes (6): createRateLimitedFetch(), DEFAULT_RETRY_DELAYS_MS, extractHostname(), RateLimitedFetchOptions, sleep(), TokenBucket

### Community 24 - "constants.ts"
Cohesion: 0.11
Nodes (15): BOARD_JOBS_SAFETY_LIMIT, CONTACT_ROLE, CONTACT_ROLE_LABELS, CONTACT_ROLE_ORDER, ContactRole, FOLLOW_UP_BADGE_CLASSNAME, FOLLOW_UP_DAYS, isJobContractType() (+7 more)

### Community 25 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 26 - "job-dialog.tsx"
Cohesion: 0.15
Nodes (11): ContactsSection(), handleAdd(), StatusTimeline(), Dialog(), DialogContent(), DialogDescription(), DialogFooter(), DialogHeader() (+3 more)

### Community 27 - "analytics/page.tsx"
Cohesion: 0.22
Nodes (10): AnalyticsPage(), buildInterviewSentence(), FunnelChart(), stages, computeMostActiveMonth(), computeStatusFunnel(), FunnelStage, MostActiveMonth (+2 more)

### Community 28 - "welcometothejungle/client.ts"
Cohesion: 0.11
Nodes (21): buildParams(), checkWttjHealth(), escapeRegExp(), fetchWttjOffers(), getWttjCredentials(), headers(), matchesKeywords(), queryJobsIndex() (+13 more)

### Community 29 - "JobStatus"
Cohesion: 0.22
Nodes (10): StatusList(), StatusListProps, statusCounts, JobStatus, STATUS_ORDER, daysAgoToDate(), main(), SEED_JOBS (+2 more)

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

### Community 40 - "jobs-create.ts"
Cohesion: 0.16
Nodes (14): CHECK_JOB_URL_RATE_LIMIT, checkJobUrl(), CREATE_JOB_RATE_LIMIT, createJob(), enrichJob(), KnownJobFields, rateLimitError(), knownJob (+6 more)

### Community 41 - "alert-dialog.tsx"
Cohesion: 0.23
Nodes (12): AlertDialog(), AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter(), AlertDialogHeader(), AlertDialogMedia() (+4 more)

### Community 42 - "discover-targets.ts"
Cohesion: 0.15
Nodes (13): companySlug(), ALL_PLATFORMS, createDiscoveredTargetIfMissing(), discoverTargets(), DiscoverTargetsOptions, DiscoverTargetsSummary, createdOfferIds, prisma (+5 more)

### Community 43 - "audit-contrast.ts"
Cohesion: 0.16
Nodes (13): audit(), contrastRatio(), css, CSS_PATH, darkFails, darkTokens, hexToRgb(), lightFails (+5 more)

### Community 44 - "connector-health-list.tsx"
Cohesion: 0.07
Nodes (25): maxDuration, StatTile(), StatTileProps, CONNECTOR_LABELS, ConnectorHealthList(), formatRelativeDate(), ConnectorHealthPanel(), handleCheck() (+17 more)

### Community 45 - "session.ts"
Cohesion: 0.25
Nodes (7): asA(), createJobAsA(), CurrentUser, getCurrentUser(), mockAuth, UNAUTHENTICATED_ERROR, ActionErrorCode

### Community 46 - "salary.ts"
Cohesion: 0.43
Nodes (5): SalaryType, WORKING_DAYS_PER_YEAR, formatSalary(), formatThousands(), normalizeAnnualSalary()

### Community 47 - "discovery.ts"
Cohesion: 0.27
Nodes (8): approveDiscoveredTarget(), PLATFORM_TO_TARGETS_KEY, rejectDiscoveredTarget(), mockAuthedAs(), target, approveDiscoveredTargetSchema, idSchema, rejectDiscoveredTargetSchema

### Community 48 - "ics.ts"
Cohesion: 0.43
Nodes (5): handleExportIcs(), buildInterviewIcs(), escapeIcsText(), IcsJob, toIcsUtc()

### Community 50 - "devDependencies"
Cohesion: 0.15
Nodes (13): eslint, jsdom, devDependencies, eslint, jsdom, @types/node, @types/react-dom, typescript (+5 more)

### Community 52 - "tabs.tsx"
Cohesion: 0.48
Nodes (4): Tabs(), TabsList(), TabsPanel(), TabsTab()

### Community 54 - "labonnealternance/client.ts"
Cohesion: 0.15
Nodes (15): checkFranceTravailHealth(), authHeaders(), buildSearchUrl(), checkLbaHealth(), fetchLbaOffers(), LbaClientOptions, query, LbaGeoPointSchema (+7 more)

### Community 56 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, build, dev, import-harvester-campaigns, lint, seed:dev, start, test (+3 more)

### Community 57 - "badge.tsx"
Cohesion: 0.12
Nodes (16): Badge(), badgeVariants, addValue(), addValues(), ChipInput(), commitDraft(), handleBlur(), handleKeyDown() (+8 more)

### Community 59 - "lib/csv-export.ts"
Cohesion: 0.31
Nodes (6): buildJobsCsv(), CSV_HEADERS, escapeCsvField(), ExportableJob, formatDate(), ExportJob

### Community 60 - "InMemorySlidingWindowRateLimiter"
Cohesion: 0.28
Nodes (3): InMemorySlidingWindowRateLimiter, RateLimiter, RateLimitResult

### Community 62 - "dependencies"
Cohesion: 0.29
Nodes (7): cheerio, lucide-react, next-themes, dependencies, cheerio, lucide-react, next-themes

### Community 63 - "board.tsx"
Cohesion: 0.09
Nodes (23): Board(), handleKeyDown(), jobs, Column(), EnrichmentPollWatcher(), getDisplayTitle(), JobCard(), handleDelete() (+15 more)

### Community 65 - "contacts.ts"
Cohesion: 0.39
Nodes (6): deleteContact(), updateContact(), contactOwnerWhere(), ContactRow(), handleDelete(), handleSave()

### Community 66 - "francetravail/normalize.ts"
Cohesion: 0.12
Nodes (19): canonicalizeUrl(), TRACKING_PARAM_PREFIXES, TRACKING_PARAMS_EXACT, LEGAL_SUFFIXES, normalizeCompanyName(), FRANCE_TRAVAIL_CONNECTOR_ID, mapContractType(), normalizeFranceTravailOffer() (+11 more)

### Community 68 - "package.json"
Cohesion: 0.33
Nodes (5): name, overrides, deepmerge-ts, private, version

### Community 70 - "campaign-form-dialog.tsx"
Cohesion: 0.09
Nodes (25): CampaignConfigJsonSchema, CampaignFormDialog(), buildPayload(), handleDelete(), EMPTY_LOCATION, LocationInput, locationsFromCampaign(), SCHEDULE_OPTIONS (+17 more)

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
Cohesion: 0.10
Nodes (18): ContractTypeSchema, Lifecycle, LifecycleSchema, NormalizedOfferSchema, RemotePolicy, RemotePolicySchema, SourceRef, SourceRefSchema (+10 more)

### Community 138 - "Vocabulaire grand public pour la section Harvester (JOB-149, JOB-150)"
Cohesion: 0.33
Nodes (5): Contexte, Correction (2026-09-01), Lexique validé, Portée : uniquement le texte affiché, Vocabulaire grand public pour la section Harvester (JOB-149, JOB-150)

### Community 139 - "Devenir de "Cibles découvertes" pour la navigation grand public (JOB-153)"
Cohesion: 0.40
Nodes (4): Contexte, Devenir de "Cibles découvertes" pour la navigation grand public (JOB-153), Décision, Portée du changement

## Knowledge Gaps
- **433 isolated node(s):** `baseCampaignInput`, `geocodedLille`, `validInput`, `PLATFORM_TO_TARGETS_KEY`, `{ afterTasks }` (+428 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **56 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `bento-card.tsx`, `application-heatmap.tsx`, `campaign-form-dialog.tsx`, `review-queue-manager.tsx`, `url-check-bar.tsx`, `alert-dialog.tsx`, `connector-health-list.tsx`, `tabs.tsx`, `button.tsx`, `badge.tsx`, `job-dialog.tsx`, `board.tsx`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Why does `logger` connect `logger.ts` to `orchestrator.ts`, `talentsoft/client.ts`, `prisma.ts`, `jobs-create.ts`, `discover-targets.ts`, `_shared.ts`, `harvest.ts`, `digitalrecruiters/client.ts`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `prisma` connect `prisma.ts` to `bento-card.tsx`, `contacts.ts`, `orchestrator.ts`, `auth-actions.ts`, `logActionError`, `jobs-create.ts`, `connector-health-list.tsx`, `session.ts`, `discovery.ts`, `_shared.ts`, `harvest.ts`, `requireUser`, `constants.ts`, `analytics/page.tsx`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Are the 11 inferred relationships involving `requireUser()` (e.g. with `mockAuthedAs()` and `mockUnauthenticated()`) actually correct?**
  _`requireUser()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **What connects `baseCampaignInput`, `geocodedLille`, `validInput` to the rest of the system?**
  _433 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `bento-card.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05030181086519115 - nodes in this community are weakly interconnected._
- **Should `orchestrator.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.052429667519181586 - nodes in this community are weakly interconnected._