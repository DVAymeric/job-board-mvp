# Graph Report - job-board-mvp  (2026-08-31)

## Corpus Check
- 428 files · ~137,818 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1638 nodes · 3791 edges · 137 communities (81 shown, 56 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 32 edges (avg confidence: 0.76)
- Token cost: 156,983 input · 0 output

## Community Hubs (Navigation)
- Bento Cards & Heatmap UI
- Harvest Orchestration & Merge
- Offer Normalization & Dedup
- France Travail Client & Query Filter
- Auth & Account Management
- Job/Contact Actions & Dialog
- Harvester Architecture Decisions
- Actions Isolation & DB Security Tests
- Digital Recruiters Connector
- Harvester Pages & Navigation
- Campaign & Job Dialog UI
- Action Validation Schemas
- E2E Test Specs
- Connector Interface & Registry
- La Bonne Alternance Connector
- TypeScript Config
- Job Creation & Enrichment
- Scraper Fetch Strategy & Logging
- Navigation & Dropdown Menu
- Harvest Actions & Connector Health
- Workday Connector
- Campaign CRUD & Slug
- Analytics Stat Tiles & Card UI
- Board Component & Job Filters
- Board Page & Constants
- shadcn/ui Registry Config
- Board & Analytics Shared Utilities
- Contacts & Search Form UI
- Welcome to the Jungle Connector
- Auth Session & Campaign Listing
- Campaign Config Import Script
- SmartRecruiters Connector
- Scraper Anti-Bot & Title Parsing
- Deployment, Secrets & Backup Docs
- Status Badge & Dev Data Seeding
- TalentSoft Client
- Review Queue Skeleton & Validation
- Scraper JSON-LD Extraction
- Harvester Geocoding
- App Icon Routes
- Company Avatar & Auto-Fetch Card
- Alert Dialog UI Primitive
- Target Discovery Orchestration
- Contrast Audit Script
- Job Search & Offer Search
- TalentSoft Discovery Probe
- Review Queue Bulk Actions
- Discovery Target Approval
- Analytics Funnel Chart
- Home Bento & Kanban Preview
- Dev Tooling Dependencies
- Connector Discovery Probes
- Interview Reminder Notifications
- Harvester Rate-Limited Fetch
- Home Page Feature Grid
- Connector Health List UI
- NPM Scripts
- Job Card Display
- URL Safety / SSRF Guard
- CSV Export Utility
- Rate Limiter
- Badge UI Primitives
- UI Theming Dependencies
- Board Keyboard Navigation
- ICS Calendar Export
- Home URL Check Bar
- Salary Formatting
- Login Page & Form
- Package Metadata
- Harvester Campaigns E2E Spec
- Board Reorder Logic
- TalentSoft Types
- Next.js Security Headers Config
- NextAuth Type Augmentation
- Vitest Test Setup
- Privacy Policy Page
- Typography & Contrast Decisions
- Job Status Timeline
- Offline Cache E2E Spec
- PWA Manifest
- Server Instrumentation
- Axe-Core Playwright Dependency
- Base UI React Dependency
- Cheerio Dependency
- clsx Dependency
- dnd-kit Core Dependency
- dnd-kit Sortable Dependency
- dnd-kit Utilities Dependency
- ESLint Config
- ESLint Next Config
- Client Instrumentation
- Discovery Schema Integration Test
- Harvester Schema Integration Test
- Next.js Dependency
- NextAuth Dependency
- Playwright Dependency
- Playwright Core Dependency
- Prisma Dependency
- Prisma Client Dependency
- React Dependency
- React DOM Dependency
- robots-parser Dependency
- Sentry Next.js Dependency
- shadcn Dependency
- Sonner Dependency
- Sparticuz Chromium Dependency
- tailwind-merge Dependency
- tw-animate-css Dependency
- ulid Dependency
- YAML Dependency
- Zod Dependency
- Playwright Test Dependency
- Tailwind CSS Dependency
- Tailwind PostCSS Dependency
- Testing Library DOM Dependency
- Testing Library Jest-DOM Dependency
- Testing Library React Dependency
- Testing Library User-Event Dependency
- tsx Dependency
- @types/react Dependency
- vite-tsconfig-paths Dependency
- Vitest Dependency
- Vitest Coverage V8 Dependency
- PostCSS Config
- Vercel Crons Config
- NextAuth Route Handlers
- Claude Next.js Agent Rules
- Deployment Rollback Runbook

## God Nodes (most connected - your core abstractions)
1. `cn()` - 91 edges
2. `requireUser()` - 63 edges
3. `prisma` - 44 edges
4. `logActionError()` - 41 edges
5. `actionError()` - 38 edges
6. `firstIssueMessage()` - 34 edges
7. `HarvestQuery` - 30 edges
8. `exactDedupKeyFromSource()` - 28 edges
9. `Button()` - 27 edges
10. `STATUS` - 22 edges

## Surprising Connections (you probably didn't know these)
- `mockAuthedAs()` --indirect_call--> `requireUser()`  [INFERRED]
  app/actions/csv-export.test.ts → lib/auth/session.ts
- `mockAuthedAs()` --indirect_call--> `requireUser()`  [INFERRED]
  app/actions/discovery.test.ts → lib/auth/session.ts
- `mockAuthedAs()` --indirect_call--> `requireUser()`  [INFERRED]
  app/actions/harvest.test.ts → lib/auth/session.ts
- `mockUnauthenticated()` --indirect_call--> `requireUser()`  [INFERRED]
  app/actions/harvest.test.ts → lib/auth/session.ts
- `mockAuthedAs()` --indirect_call--> `requireUser()`  [INFERRED]
  app/actions/jobs-create.test.ts → lib/auth/session.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Portage progressif de job-harvester vers job-board-mvp** — job_harvester_origin_repo, docs_decision_pas_de_serveur_hono_decision, docs_decision_scheduling_harvester_decision, docs_superpowers_plans_20260818_job40_campaign_model, docs_superpowers_plans_20260830_decouverte_discovertargets [INFERRED 0.85]
- **Fusion des schémas Harvester → Prisma : Campaign, HarvestedOffer, ConnectorRun** — docs_superpowers_plans_20260818_job40_campaign_model, docs_superpowers_plans_20260818_job40_harvestedoffer_model, docs_superpowers_plans_20260818_job40_connectorrun_model [EXTRACTED 1.00]
- **Sondes de découverte de cibles connecteurs (Workday/SmartRecruiters/Talentsoft/DigitalRecruiters) orchestrées par discoverTargets** — docs_superpowers_plans_20260830_decouverte_probeworkday, docs_superpowers_plans_20260830_decouverte_probesmartrecruiters, docs_superpowers_plans_20260830_decouverte_probetalentsoft, docs_superpowers_plans_20260830_decouverte_probedigitalrecruiters, docs_superpowers_plans_20260830_decouverte_discovertargets [EXTRACTED 1.00]

## Communities (137 total, 56 thin omitted)

### Community 0 - "Bento Cards & Heatmap UI"
Cohesion: 0.05
Nodes (38): Loading(), FEATURES, TarifsPage(), ApplicationHeatmap(), formatCellTitle(), isHighContrastLevel(), legendCount(), LEVEL_3_THRESHOLDS (+30 more)

### Community 1 - "Harvest Orchestration & Merge"
Cohesion: 0.06
Nodes (44): GET(), harvestEnv(), FUZZY_MATCH_THRESHOLD, isDuplicate(), isExactDuplicate(), isFuzzyDuplicate(), mergeOffers(), makeOffer() (+36 more)

### Community 2 - "Offer Normalization & Dedup"
Cohesion: 0.08
Nodes (38): canonicalizeUrl(), TRACKING_PARAM_PREFIXES, TRACKING_PARAMS_EXACT, LEGAL_SUFFIXES, normalizeCompanyName(), mapContractType(), normalizeFranceTravailOffer(), parseLieuTravail() (+30 more)

### Community 3 - "France Travail Client & Query Filter"
Cohesion: 0.05
Nodes (47): ALTERNANCE_ONLY_TYPES, authHeaders(), buildSearchUrl(), CachedToken, checkFranceTravailHealth(), fetchFranceTravailOffers(), FRANCE_TRAVAIL_CONNECTOR_ID, FranceTravailClientOptions (+39 more)

### Community 4 - "Auth & Account Management"
Cohesion: 0.07
Nodes (27): AuthFormState, deleteAccount(), registerAction(), registerSchema, registerUser(), atkinsonHyperlegible, bricolageGrotesque, geistMono (+19 more)

### Community 5 - "Job/Contact Actions & Dialog"
Cohesion: 0.14
Nodes (38): addContact(), deleteContact(), updateContact(), updateJobContractType(), updateJobDetails(), updateJobDocuments(), updateJobInterviewDate(), updateJobNotes() (+30 more)

### Community 6 - "Harvester Architecture Decisions"
Cohesion: 0.07
Nodes (35): Décision : pas de serveur HTTP Hono pour Harvester (JOB-48), Simplification actée : une cadence cron globale plutôt qu'une par campagne, Décision : déclenchement planifié via Vercel Cron (JOB-52), Convention codes ROME pour les campagnes de collecte (JOB-71), Décision : post-filtre centralisé contrat/mots-clés/localisation (JOB-73), resolveLocationVerdict — cascade de vérification de localisation à 3 niveaux, Isolation multi-tenant Harvester (scoping userId), Rate limiting du déclenchement de collecte (prévu pour les tickets 9/14) (+27 more)

### Community 7 - "Actions Isolation & DB Security Tests"
Cohesion: 0.12
Nodes (12): exportJobsCsv(), mockAuthedAs(), asA(), createJobAsA(), STATUS, assertDatabaseUrlIsEncrypted(), TLS_INDICATORS, can() (+4 more)

### Community 8 - "Digital Recruiters Connector"
Cohesion: 0.10
Nodes (20): checkDigitalRecruitersHealth(), DIGITALRECRUITERS_CONNECTOR_ID, DigitalRecruitersClientOptions, fetchDigitalRecruitersOffers(), fetchJobAdsPage(), headers(), query, digitalRecruitersConnector (+12 more)

### Community 9 - "Harvester Pages & Navigation"
Cohesion: 0.15
Nodes (19): HarvesterCampaignsPage(), HarvesterDiscoveryPage(), HarvesterPage(), HarvesterReviewPage(), Loading(), RECHERCHE_SKELETON_ROW_COUNT, DiscoveredTargetsManager(), handleApprove() (+11 more)

### Community 10 - "Campaign & Job Dialog UI"
Cohesion: 0.10
Nodes (21): CampaignConfigJsonSchema, CampaignFormDialog(), buildPayload(), handleDelete(), EMPTY_LOCATION, EMPTY_WORKDAY_TARGET, LocationInput, locationsFromCampaign() (+13 more)

### Community 11 - "Action Validation Schemas"
Cohesion: 0.10
Nodes (30): addContactSchema, addTagToJobSchema, checkJobUrlSchema, COMPANY_NAME_MAX_LENGTH, companyNameSchema, contactLinkedinUrlSchema, contactRoleSchema, createJobSchema (+22 more)

### Community 12 - "E2E Test Specs"
Cohesion: 0.07
Nodes (12): prisma, prisma, stamp, FIXTURE_HTML, FixtureServer, startFixtureServer(), prisma, stamp (+4 more)

### Community 13 - "Connector Interface & Registry"
Cohesion: 0.19
Nodes (16): Connector, ConnectorContext, francetravailConnector, labonnealternanceConnector, smartrecruitersConnector, talentsoftConnector, ENV_KEYS, query (+8 more)

### Community 14 - "La Bonne Alternance Connector"
Cohesion: 0.11
Nodes (21): authHeaders(), buildSearchUrl(), checkLbaHealth(), fetchLbaOffers(), LBA_CONNECTOR_ID, LbaClientOptions, query, mapContractType() (+13 more)

### Community 15 - "TypeScript Config"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 16 - "Job Creation & Enrichment"
Cohesion: 0.13
Nodes (19): CHECK_JOB_URL_RATE_LIMIT, checkJobUrl(), CREATE_JOB_RATE_LIMIT, createJob(), enrichJob(), KnownJobFields, afterCallbacks, mockAuthedAs() (+11 more)

### Community 17 - "Scraper Fetch Strategy & Logging"
Cohesion: 0.18
Nodes (14): LogFields, logger, LogLevel, ANTI_BOT_STATUS_CODES, fetchMetadataViaHttp(), REQUEST_HEADERS, scrapeJobMetadata(), EMPTY (+6 more)

### Community 18 - "Navigation & Dropdown Menu"
Cohesion: 0.10
Nodes (19): logoutAction(), LINKS, MobileMenu(), Nav(), noopSubscribe(), session, ThemeToggle(), useMounted() (+11 more)

### Community 19 - "Harvest Actions & Connector Health"
Cohesion: 0.13
Nodes (19): CONNECTORS_HEALTH_GLOBAL_RATE_LIMIT, CONNECTORS_HEALTH_RATE_LIMIT, getConnectorsHealth(), ignoreHarvestedOffer(), importHarvestedOffer(), __resetConnectorsHealthRateLimitsForTests(), { afterTasks }, mockAuthedAs() (+11 more)

### Community 20 - "Workday Connector"
Cohesion: 0.12
Nodes (22): buildSearchTerms(), checkWorkdayHealth(), CONTRACT_SEARCH_TERMS, cxsBaseUrl(), fetchJobDetail(), fetchJobList(), fetchWorkdayOffers(), headers() (+14 more)

### Community 21 - "Campaign CRUD & Slug"
Cohesion: 0.15
Nodes (15): createCampaign(), deleteCampaign(), asA(), baseCampaignInput, createCampaignAsA(), updateCampaign(), campaignOwnerWhere(), handleSave() (+7 more)

### Community 22 - "Analytics Stat Tiles & Card UI"
Cohesion: 0.18
Nodes (16): StatTile(), StatTileProps, ExportCsvButton(), handleExport(), Card(), CardAction(), CardContent(), CardDescription() (+8 more)

### Community 23 - "Board Component & Job Filters"
Cohesion: 0.14
Nodes (11): Board(), jobs, Column(), baseJob, STATUS_CONFIG, matchesJobQuery(), matchesSelectedTags(), job() (+3 more)

### Community 24 - "Board Page & Constants"
Cohesion: 0.12
Nodes (13): BOARD_JOBS_SAFETY_LIMIT, CONTACT_ROLE, CONTACT_ROLE_LABELS, CONTACT_ROLE_ORDER, ContactRole, FOLLOW_UP_DAYS, isJobContractType(), JOB_CONTRACT_TYPE (+5 more)

### Community 25 - "shadcn/ui Registry Config"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 26 - "Board & Analytics Shared Utilities"
Cohesion: 0.19
Nodes (7): AnalyticsEmptyState(), EnrichmentPollWatcher(), JobResultRow(), baseResult, Button(), buttonVariants, formatDateFr()

### Community 27 - "Contacts & Search Form UI"
Cohesion: 0.15
Nodes (14): ContactsSection(), handleAdd(), CONTRACT_TYPE_OPTIONS, SearchForm(), Input(), SelectContent(), SelectGroup(), SelectItem() (+6 more)

### Community 28 - "Welcome to the Jungle Connector"
Cohesion: 0.15
Nodes (16): buildParams(), checkWttjHealth(), escapeRegExp(), fetchWttjOffers(), getWttjCredentials(), headers(), matchesKeywords(), queryJobsIndex() (+8 more)

### Community 29 - "Auth Session & Campaign Listing"
Cohesion: 0.15
Nodes (15): listCampaigns(), geocodedLille, mockAuthedAs(), mockUnauthenticated(), validInput, mockAuthedAs(), mockAuthedAs(), mockAuthedAs() (+7 more)

### Community 30 - "Campaign Config Import Script"
Cohesion: 0.14
Nodes (15): CampaignConfig, CampaignConfigSchema, CampaignsFileSchema, CONTRACT_TYPE_TO_PRISMA_ENUM, LocationConfig, LocationConfigSchema, mapYamlCampaignToCreateInput(), StoredCampaignConfigSchema (+7 more)

### Community 31 - "SmartRecruiters Connector"
Cohesion: 0.16
Nodes (16): checkSmartRecruitersHealth(), CONTRACT_TITLE_PATTERNS, fetchPostingDetail(), fetchPostingsList(), fetchSmartRecruitersOffers(), headers(), matchesContractTypes(), SMARTRECRUITERS_CONNECTOR_ID (+8 more)

### Community 32 - "Scraper Anti-Bot & Title Parsing"
Cohesion: 0.19
Nodes (14): BLOCK_PAGE_TITLES, isBlockPageTitle(), extractJobMetadataFromHtml(), extractMetaContent(), extractTitleTag(), AGGREGATOR_HOSTNAME_FRAGMENTS, getHostname(), isAggregatorHostname() (+6 more)

### Community 33 - "Deployment, Secrets & Backup Docs"
Cohesion: 0.15
Nodes (19): Service Postgres local (docker-compose), Chiffrement at-rest (à confirmer au provisionnement), Chiffrement in-transit (TLS forcé en production), Revue explicite des secrets (JOB-118), Procédure de rotation des secrets en cas de fuite, Procédure de déploiement, Drill de restauration testé (pg_dump/pg_restore contre docker-compose), Politique de rétention des sauvegardes (à activer au provisionnement) (+11 more)

### Community 34 - "Status Badge & Dev Data Seeding"
Cohesion: 0.17
Nodes (13): StatusList(), StatusListProps, statusCounts, STATUS_BADGE_CLASSNAME, STATUS_ICONS, StatusBadge(), StatusBadgeProps, JobStatus (+5 more)

### Community 35 - "TalentSoft Client"
Cohesion: 0.20
Nodes (15): checkTalentsoftHealth(), decodeXmlEntities(), detectTalentsoftPlatform(), extractAllTags(), extractTag(), fetchRssItems(), fetchTalentsoftOffers(), headers() (+7 more)

### Community 36 - "Review Queue Skeleton & Validation"
Cohesion: 0.14
Nodes (11): Skeleton(), SkeletonProps, CAMPAIGN_CONTRACT_TYPE_LABELS, CAMPAIGN_CONTRACT_TYPES, campaignFieldsSchema, campaignIdSchema, campaignLocationInputSchema, createCampaignSchema (+3 more)

### Community 37 - "Scraper JSON-LD Extraction"
Cohesion: 0.21
Nodes (14): extractEmploymentType(), extractHiringOrganizationName(), extractJobLocation(), extractJobPostingFromJsonLd(), extractLogo(), flattenJsonLdCandidates(), hasJobPostingType(), JobPostingJsonLd (+6 more)

### Community 38 - "Harvester Geocoding"
Cohesion: 0.20
Nodes (10): mockGeocodingSuccess(), BanFeature, geocodeCity(), GeocodedCity, LocationInput, ResolvedLocation, resolveLocations(), ResolveLocationsResult (+2 more)

### Community 39 - "App Icon Routes"
Cohesion: 0.16
Nodes (7): contentType, size, dynamic, dynamic, contentType, size, AppIconMark()

### Community 40 - "Company Avatar & Auto-Fetch Card"
Cohesion: 0.22
Nodes (9): AvatarJob, CompanyAvatar(), getInitial(), base, AutoFetchCard(), AutoFetchCardProps, buildBrandfetchLogoUrl(), buildClearbitLogoUrl() (+1 more)

### Community 41 - "Alert Dialog UI Primitive"
Cohesion: 0.28
Nodes (11): AlertDialog(), AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter(), AlertDialogHeader(), AlertDialogMedia() (+3 more)

### Community 42 - "Target Discovery Orchestration"
Cohesion: 0.16
Nodes (12): ALL_PLATFORMS, createDiscoveredTargetIfMissing(), discoverTargets(), DiscoverTargetsOptions, DiscoverTargetsSummary, createdOfferIds, prisma, ProbeResult (+4 more)

### Community 43 - "Contrast Audit Script"
Cohesion: 0.16
Nodes (13): audit(), contrastRatio(), css, CSS_PATH, darkFails, darkTokens, hexToRgb(), lightFails (+5 more)

### Community 44 - "Job Search & Offer Search"
Cohesion: 0.21
Nodes (10): RecherchePage(), JobResult, EMPTY_CRITERIA, OfferSearch(), SearchableOffer, SearchCriteria, CampaignContractType, getSearchableOffers() (+2 more)

### Community 45 - "TalentSoft Discovery Probe"
Cohesion: 0.23
Nodes (9): candidateDomains(), looksLikeTalentsoft(), probeTalentsoft(), withTimeout(), getRobots(), isAllowedByRobots(), Robots, robotsCache (+1 more)

### Community 46 - "Review Queue Bulk Actions"
Cohesion: 0.21
Nodes (9): formatDate(), ReviewQueueManager(), handleBulkIgnore(), handleBulkImport(), handleIgnore(), handleImport(), removeOffer(), withPending() (+1 more)

### Community 47 - "Discovery Target Approval"
Cohesion: 0.27
Nodes (8): approveDiscoveredTarget(), PLATFORM_TO_TARGETS_KEY, rejectDiscoveredTarget(), mockAuthedAs(), target, approveDiscoveredTargetSchema, idSchema, rejectDiscoveredTargetSchema

### Community 48 - "Analytics Funnel Chart"
Cohesion: 0.26
Nodes (8): AnalyticsPage(), buildInterviewSentence(), FunnelChart(), stages, computeMostActiveMonth(), computeStatusFunnel(), FunnelStage, MostActiveMonth

### Community 49 - "Home Bento & Kanban Preview"
Cohesion: 0.28
Nodes (7): BentoSection(), KanbanPreviewCard(), KanbanPreviewCardProps, needsFollowUp(), STATUS_ORDER, computeFollowUpSummary(), computeStatusCounts()

### Community 50 - "Dev Tooling Dependencies"
Cohesion: 0.15
Nodes (13): eslint, jsdom, devDependencies, eslint, jsdom, @types/node, @types/react-dom, typescript (+5 more)

### Community 51 - "Connector Discovery Probes"
Cohesion: 0.23
Nodes (6): probeDigitalRecruiters(), probeSmartRecruiters(), DC_CANDIDATES, DiscoveredWorkdayTarget, probeWorkday(), USER_AGENT

### Community 52 - "Interview Reminder Notifications"
Cohesion: 0.24
Nodes (4): InterviewReminderWatcher(), FakeNotification, getUpcomingInterviews(), InterviewCandidate

### Community 53 - "Harvester Rate-Limited Fetch"
Cohesion: 0.26
Nodes (6): createRateLimitedFetch(), DEFAULT_RETRY_DELAYS_MS, extractHostname(), RateLimitedFetchOptions, sleep(), TokenBucket

### Community 54 - "Home Page Feature Grid"
Cohesion: 0.25
Nodes (5): maxDuration, FeatureGrid(), FEATURES, REASSURANCES, TrustRow()

### Community 55 - "Connector Health List UI"
Cohesion: 0.25
Nodes (5): CONNECTOR_LABELS, ConnectorHealthList(), formatRelativeDate(), ConnectorBadge(), ConnectorBadgeProps

### Community 56 - "NPM Scripts"
Cohesion: 0.18
Nodes (11): scripts, build, dev, import-harvester-campaigns, lint, seed:dev, start, test (+3 more)

### Community 57 - "Job Card Display"
Cohesion: 0.29
Nodes (7): getDisplayTitle(), JobCard(), handleDelete(), STATUS_DATE_LABEL, FOLLOW_UP_BADGE_CLASSNAME, JobContractType, getCurrentStatusDate()

### Community 58 - "URL Safety / SSRF Guard"
Cohesion: 0.31
Nodes (8): ALLOWED_PROTOCOLS, isDisallowedFetchTarget(), isPrivateOrLoopbackHostname(), isPrivateOrLoopbackIPv4(), normalizeUrl(), SENSITIVE_PARAMS, TRACKING_PARAMS, urlSchema

### Community 59 - "CSV Export Utility"
Cohesion: 0.31
Nodes (6): buildJobsCsv(), CSV_HEADERS, escapeCsvField(), ExportableJob, formatDate(), ExportJob

### Community 60 - "Rate Limiter"
Cohesion: 0.28
Nodes (3): InMemorySlidingWindowRateLimiter, RateLimiter, RateLimitResult

### Community 61 - "Badge UI Primitives"
Cohesion: 0.39
Nodes (4): Badge(), badgeVariants, SourceTagBadge(), SourceTagBadgeProps

### Community 62 - "UI Theming Dependencies"
Cohesion: 0.29
Nodes (7): class-variance-authority, lucide-react, next-themes, dependencies, class-variance-authority, lucide-react, next-themes

### Community 63 - "Board Keyboard Navigation"
Cohesion: 0.43
Nodes (5): handleKeyDown(), adjacentStatus(), BoardColumn, computeNextFocusedJob(), FocusDirection

### Community 64 - "ICS Calendar Export"
Cohesion: 0.43
Nodes (5): handleExportIcs(), buildInterviewIcs(), escapeIcsText(), IcsJob, toIcsUtc()

### Community 65 - "Home URL Check Bar"
Cohesion: 0.33
Nodes (3): UrlCheckBar(), UrlCheckBarProps, UrlCheckResultTag

### Community 66 - "Salary Formatting"
Cohesion: 0.43
Nodes (5): SalaryType, WORKING_DAYS_PER_YEAR, formatSalary(), formatThousands(), normalizeAnnualSalary()

### Community 67 - "Login Page & Form"
Cohesion: 0.47
Nodes (3): loginAction(), initialState, LoginForm()

### Community 68 - "Package Metadata"
Cohesion: 0.33
Nodes (5): name, overrides, deepmerge-ts, private, version

### Community 71 - "TalentSoft Types"
Cohesion: 0.40
Nodes (4): TalentsoftRawOffer, TalentsoftRawOfferSchema, TalentsoftRssItem, TalentsoftRssItemSchema

### Community 73 - "NextAuth Type Augmentation"
Cohesion: 0.40
Nodes (4): JWT, next-auth, next-auth/jwt, Session

### Community 76 - "Typography & Contrast Decisions"
Cohesion: 0.50
Nodes (4): Échelle typographique et espacements (a11y, JOB-87), Audit de contraste AA des tokens de design (JOB-112/124), Correctif JOB-102 : BentoSection conservée (données personnalisées, pas du marketing statique), Décision produit : rôle de la page d'accueil (JOB-101)

## Knowledge Gaps
- **415 isolated node(s):** `baseCampaignInput`, `geocodedLille`, `validInput`, `PLATFORM_TO_TARGETS_KEY`, `{ afterTasks }` (+410 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **56 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Analytics Stat Tiles & Card UI` to `Bento Cards & Heatmap UI`, `Home URL Check Bar`, `Status Badge & Dev Data Seeding`, `Review Queue Skeleton & Validation`, `Company Avatar & Auto-Fetch Card`, `Harvester Pages & Navigation`, `Alert Dialog UI Primitive`, `Campaign & Job Dialog UI`, `Navigation & Dropdown Menu`, `Connector Health List UI`, `Board Component & Job Filters`, `Job Card Display`, `Board & Analytics Shared Utilities`, `Contacts & Search Form UI`, `Badge UI Primitives`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `logger` connect `Scraper Fetch Strategy & Logging` to `Harvest Orchestration & Merge`, `TalentSoft Client`, `Job/Contact Actions & Dialog`, `Harvester Geocoding`, `Actions Isolation & DB Security Tests`, `Digital Recruiters Connector`, `Target Discovery Orchestration`, `Job Search & Offer Search`, `Harvest Actions & Connector Health`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `prisma` connect `Actions Isolation & DB Security Tests` to `Harvest Orchestration & Merge`, `Auth & Account Management`, `Job/Contact Actions & Dialog`, `Harvester Pages & Navigation`, `Job Search & Offer Search`, `Discovery Target Approval`, `Job Creation & Enrichment`, `Home Bento & Kanban Preview`, `Harvest Actions & Connector Health`, `Campaign CRUD & Slug`, `Analytics Stat Tiles & Card UI`, `Board Page & Constants`, `Auth Session & Campaign Listing`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Are the 11 inferred relationships involving `requireUser()` (e.g. with `mockAuthedAs()` and `mockUnauthenticated()`) actually correct?**
  _`requireUser()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **What connects `baseCampaignInput`, `geocodedLille`, `validInput` to the rest of the system?**
  _415 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Bento Cards & Heatmap UI` be split into smaller, more focused modules?**
  _Cohesion score 0.05336538461538461 - nodes in this community are weakly interconnected._
- **Should `Harvest Orchestration & Merge` be split into smaller, more focused modules?**
  _Cohesion score 0.06284153005464481 - nodes in this community are weakly interconnected._