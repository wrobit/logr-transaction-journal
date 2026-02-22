# Logr — Crypto Journal

Implementation Plan (Next.js App Router + TypeScript + Drizzle + Neon + shadcn/ui)

**Logr** is a minimal, personal crypto transaction journal focused on correctness, transparency, and accounting-style clarity. No hype, no trading features — just structured records, PLN valuation via NBP, and clear profit/loss.

---

## 1) Product Goals

- Capture each transaction as an immutable accounting entry
- Provide accurate PLN valuation using official NBP rates
- Offer a clean, low-friction UI for personal tracking and tax prep
- Keep calculations deterministic and reproducible

---

## 2) Tech Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Database**: Neon (PostgreSQL)
- **ORM**: Drizzle
- **UI**: shadcn/ui + Tailwind CSS
- **Auth**: NextAuth (Credentials provider)
- **Validation**: zod
- **Passwords**: bcrypt
- **Charts (optional)**: Recharts or Chart.js

---

## 3) Core Principles

- One entry = one immutable transaction record
- PLN value always derived from NBP table A
- All financial calculations are deterministic
- Built for personal accounting, not trading analytics

---

## 4) Business Rules

### PLN Valuation (NBP)

- Rate source: **NBP Table A**
- Rate date resolution:
  - Weekday → previous calendar day
  - Weekend → previous Friday
  - If NBP has no data (404) → step backwards day-by-day
- `valuePLN = fullPrice × nbpRate`
- If quote currency is PLN → `nbpRate = 1`

### Profit / Loss

- Formula: `PnL = Σ(sell.valuePLN) − Σ(buy.valuePLN)`
- Commission is stored explicitly and:
  - included in buy cost / sell proceeds (default)
  - optional separate display (future option)

---

## 5) Routes

### Public

- `/login`
- `/register`

### Protected

#### `/` — Entries

Primary workspace for transaction history and data entry.

Features:

- Date range filter
- Asset/operation filters (future)
- Entries table
- Primary action: **Add entry**

Table columns:

- Date
- Operation (Buy / Sell)
- Asset / Currency (e.g. SOL / USD)
- Quantity
- Price per unit
- Full price
- Commission
- Source
- NBP rate
- Value (PLN)
- Note

#### `/summary` — Summary

High-level financial overview.

- Total buy value (PLN)
- Total sell value (PLN)
- Total PnL (PLN)
- Holdings per asset:
  - Net quantity
  - Buy PLN / Sell PLN / PnL PLN

#### `/profile` — Profile

User account management.

- Name
- Surname
- Login
- Email
- Delete account section:
  - `AlertDialog` confirmation
  - Optional text confirmation (“DELETE”)
  - Cascading delete of all entries

#### `/dashboard` — Dashboard (optional)

Visual overview of data.

- PnL over time
- Buy vs Sell volume
- Buy vs Sell by asset
- Asset distribution
- Realized PnL % KPI

---

## 6) Data Model (Drizzle + Postgres)

### `users`

- `id` (uuid, pk)
- `email` (text, unique)
- `login` (text, unique)
- `passwordHash` (text)
- `firstName` (text)
- `lastName` (text)
- `createdAt`
- `updatedAt`

### `entries`

- `id` (uuid, pk)
- `userId` (uuid, fk → users.id)
- `date` (date)
- `operation` (`BUY | SELL`)
- `baseAsset` (text)
- `quoteCurrency` (text)
- `quantity` (numeric(30,12))
- `pricePerUnit` (numeric(30,12))
- `fullPrice` (numeric(30,12))
- `commission` (numeric(30,12), nullable)
- `source` (text, nullable)
- `note` (text, nullable)
- `nbpRateDate` (date)
- `nbpRate` (numeric(18,6))
- `valuePLN` (numeric(30,2))
- `createdAt`
- `updatedAt`

### `fx_rates_cache`

- `id` (uuid)
- `currency` (text)
- `rateDate` (date)
- `rate` (numeric(18,6))
- Unique constraint: `(currency, rateDate)`

---

## 7) NBP Integration

Module: `/lib/nbp`

Responsibilities:

- Resolve correct rate date
- Fetch NBP rate
- Handle weekends and missing days
- Cache results

Flow on entry creation:

1. User submits entry form
2. Server calculates `fullPrice`
3. Rate date is resolved
4. NBP rate fetched or loaded from cache
5. `valuePLN` computed and persisted

---

## 8) UI Structure (shadcn/ui)

### Entries Page

- `Table`
- `Badge` for Buy/Sell
- Numeric formatting helpers
- Sticky **Add entry** button

### Add Entry Dialog

Fields:

- Date
- Operation
- Asset
- Quote currency
- Quantity
- Price per unit
- Commission
- Source
- Note

Live preview:

- Full price
- NBP rate + date
- Value in PLN

### Summary Page

- Cards: Buy PLN / Sell PLN / PnL
- Holdings table

### Profile Page

- Read-only user data
- Delete account `AlertDialog`

---

## 9) Project Structure

- `app`
  - `(auth)`
    - `login`
    - `register`
  - `(protected)`
    - `page.tsx` (entries)
    - `summary`
    - `profile`
    - `dashboard`
- `components`
  - `entries/`
  - `summary/`
  - `profile/`
  - `dashboard/`
- `lib`
  - `db/`
  - `nbp/`
  - `auth/`
  - `format/`
- `actions`
  - `entries.ts`
  - `summary.ts`
  - `profile.ts`

---

## 10) Implementation Phases

### Phase 1 — Foundation

- [x] Project setup
- [x] Drizzle + Neon
- [x] shadcn/ui

### Phase 2 — Auth

- [x] Register / login
- [x] Session protection

Auth Pages Implementation Plan:

- Define Cursor-style layout (LOGR top-left, centered content, dark canvas)
- Set up NextAuth with Credentials + Google + GitHub providers
- Configure env vars: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_ID/SECRET`
- Build `/login` and `/register` pages with shadcn/ui, OAuth buttons first
- Add zod validation + bcrypt hashing for credentials
- Implement user creation flow and OAuth user provisioning
- Add `proxy.ts` protection for `(protected)` routes

### Phase 3 — Core Logic

- [x] Define entry creation server action with zod validation and type-safe payload
- [x] Compute derived fields (`fullPrice`, `valuePLN`, `nbpRateDate`) server-side
- [x] Implement NBP rate resolver with weekend/holiday fallback
- [x] Add fx_rates_cache lookup + insert on cache miss
- [x] Create DB insert for entries with Drizzle + return inserted row
- [x] Wire entry creation to UI submit (server action or API route)
- [x] Return validation errors to the UI with field mapping
- [x] Add tests for NBP resolver edge cases (weekends, 404 fallback)
- [x] Add tests for cache hit/miss behavior
- [x] Add tests for entry creation calculation correctness
- [x] Add tests for server action validation failures

### Phase 4 — Entries UI

- [x] Build entries table component with formatting helpers
- [x] Add date range filter (client-side filter for now)
- [x] Add asset/operation filters (client-side, simple select)
- [x] Add pagination (client-side, slice results)
- [x] Build add entry dialog with form fields + live preview
- [x] Hook dialog submit to Phase 3 server action
- [x] Show loading, success, and error toasts
- [x] Ensure empty state and error state rendering
- [x] Add tests for table rendering, filters, and pagination
- [x] Add tests for entry form validation + submit flow

### Phase 4.1 — Entries Querying (Server-Backed)

- [x] Add server-backed filters and pagination via query params
- [x] Add indexed queries for date range + asset + operation filters
- [x] Add loading states for server-side table refresh
- [x] Add tests for query param parsing and DB filtering
- [x] Add rows numbering
- [x] Add actions column with edit / preview / delete row (destructive)
- [x] Make entries table horizontally scrollable on smaller viewports

### Phase 5 — Dashboard

- [x] Define dashboard grid layout + HUD-style panels
- [x] Add filter bar (time range dropdown + asset dropdown)
- [x] Default time range: All time (7D/30D/90D/YTD/All)
- [x] Realized PnL only (default)
- [x] Build server aggregations (PnL series, buy vs sell, holdings mix)
- [x] Add KPI cards (total buys, total sells, realized PnL)
- [x] Add charts with shadcn (line PnL, stacked buy/sell, donut holdings)
- [x] Hook filters to server refresh + loading/empty states
- [x] Add tests for aggregations and dashboard render

### Phase 6 — Profile + Navigation

#### Phase 6.1 — Profile Data + Actions

- [x] Add profile fetch action (current user)
- [x] Add profile update action (first/last/login/email)
- [x] Add delete account action (cascade delete entries)

#### Phase 6.2 — Profile UI (Editable)

- [x] Read-only summary section
- [x] Minimal edit controls for profile fields
- [x] Validation + inline errors
- [x] Add display currency selector (`PLN | EUR | USD`) and persist preference

#### Phase 6.3 — Account Deletion Flow

- [x] Lethal warning copy + consequences
- [x] Require typing “DELETE” to confirm
- [x] AlertDialog confirmation

#### Phase 6.4 — Goodbye Screen

- [x] Post-delete confirmation screen
- [x] “Why are you leaving?” options + freeform
- [x] “I’ve changed my mind” CTA

#### Phase 6.5 — Tests

- [x] Profile render + edit validation
- [x] Delete confirmation requirement
- [x] Goodbye screen rendering

### Phase 7 — Website Metadata & SEO

- [x] Define default metadata baseline (title template, description, keywords, app name)
- [x] Add global `metadata` in `app/layout.tsx` (App Router):
  - [x] Title template + default title
  - [x] `description`, `applicationName`, `authors`
  - [x] `robots` set to `noindex, nofollow` in non-prod (if env supports)
- [x] Add Open Graph + Twitter defaults with placeholder images:
  - [x] `openGraph` title/description/siteName/type/images
  - [x] `twitter` card `summary_large_image` + images
- [x] Add per-route metadata for auth and protected pages:
  - [x] `/login`, `/register`
  - [x] `/`, `/dashboard`, `/profile`, `/goodbye`
  - [x] Use “Logr — {Page}” titles + concise descriptions
- [x] Add app icons + manifest placeholders:
  - [x] `favicon.ico`, `icon.svg`, `apple-touch-icon.svg`
  - [x] `site.webmanifest` with name, theme colors, icons

### Phase 8 — Footer Crypto Ticker

- [x] Fetch top 10 assets from CoinPaprika (`/v1/tickers?limit=10`) with `revalidate: 60`
- [x] Normalize response into `TickerItem` (symbol, name, priceUsd, changePct, trend)
- [x] Render ticker only for authenticated users (hide on auth routes)
- [x] Build sticky bottom bar with muted, minimal styling
- [x] Implement infinite horizontal carousel animation with duplicated items
- [x] Show symbol, USD price, % change, and up/down arrow per asset
- [x] Respect `prefers-reduced-motion` and pause on hover
- [x] Hide ticker on empty or failed API response

### Phase 9 — Subscriptions and payments with Polar.sh

Plan tiers (initial):

- `Free`: max `25` total entries, max `1` CSV import/month, max `25` rows/import
- `Pro`: max `5,000` total entries, max `30` CSV imports/month, max `2,000` rows/import
- `Scale`: max `100,000` total entries, max `300` CSV imports/month, max `10,000` rows/import

### Phase 9.1 - Pricing model and entitlements

- [ ] Finalize plan catalog: `free | pro | scale`
- [ ] Define entitlement matrix (entry cap, imports/month, rows/import, export access)
- [ ] Store entitlement config in code as versioned constants (not hardcoded in UI)
- [ ] Define enforcement policy (`hard block` on limit reached + clear upgrade CTA)

### Phase 9.2 - Billing data model

- [ ] Add `users.plan` enum (`free | pro | scale`) with default `free`
- [ ] Add billing fields on `users`: `billingCustomerId`, `billingSubscriptionId`, `billingStatus`, `billingCurrentPeriodEnd`
- [ ] Add usage table (monthly buckets): `usage_counters` (`userId`, `period`, `metric`, `count`)
- [ ] Add billing event audit table for webhook traceability and replay safety

### Phase 9.3 - Polar.sh integration

- [ ] Create Polar products/prices for `Pro` and `Scale`
- [ ] Implement checkout session action for upgrades
- [ ] Implement customer portal action for manage/cancel
- [ ] Implement webhook endpoint (subscription created/updated/canceled/payment failed)
- [ ] Add webhook signature verification + idempotent event processing

### Phase 9.4 - Entitlement enforcement

- [ ] Enforce entry limit in create entry server action
- [ ] Enforce import limits in CSV import pipeline (count + rows/import)
- [ ] Enforce export limits/features by plan
- [ ] Add centralized `assertEntitlement(userId, action)` helper for consistency

### Phase 9.5 - Billing UI

- [ ] Add `/billing` page with current plan, usage bars, renewal date, status
- [ ] Add upgrade/downgrade controls and `Manage billing` button
- [ ] Show in-context paywall cards when limits are reached
- [ ] Localize all billing copy and errors (`en` + `pl`)

### Phase 9.6 - Testing and ops

- [ ] Add tests for entitlement checks across entry create/import/export
- [ ] Add webhook tests (signature, idempotency, lifecycle transitions)
- [ ] Add metrics/logging for limit-block events and billing failures
- [ ] Add admin visibility for user plan + billing status (read-only)

### Phase 9.7 - Acceptance criteria

- [ ] User can upgrade/downgrade via Polar checkout/portal
- [ ] Plan changes sync correctly via webhooks
- [ ] Limits are enforced server-side (not bypassable from client)
- [ ] Reached-limit UX is clear and includes upgrade path

### Phase 9.8 - Strict implementation order

- [ ] Milestone 9-M1: `9.1 -> 9.2` (plan model and persistence first)
- [ ] Milestone 9-M2: `9.3` (checkout/portal/webhooks with idempotency)
- [ ] Milestone 9-M3: `9.4` (server-side entitlement guards)
- [ ] Milestone 9-M4: `9.5` (billing UX, limits, and upgrade paths)
- [ ] Milestone 9-M5: `9.6 -> 9.7` (tests/ops hardening and acceptance sign-off)

### Phase 10 — Import & Export with exchange CSV providers

Initial providers:

- `Kraken`
- `ZondaCrypto`
- `Binance`

### Phase 10.1 - Scope and canonical import model

- [ ] Define canonical transaction DTO for import normalization
- [ ] Define operation mapping rules to app model (`BUY/SELL`; unsupported rows flagged)
- [ ] Define required/optional fields and strict validation behavior
- [ ] Lock provider support scope for v1: `Kraken`, `ZondaCrypto`, `Binance`

### Phase 10.2 - CSV parser adapters

- [ ] Implement `KrakenCsvAdapter` (column map, date/amount parsing, symbol normalization)
- [ ] Implement `ZondaCryptoCsvAdapter` (column map + operation mapping)
- [ ] Implement `BinanceCsvAdapter` (spot trade history + fee handling)
- [ ] Add delimiter/encoding detection (`comma/semicolon`, UTF-8 BOM-safe)

### Phase 10.3 - Import pipeline

- [ ] Build upload -> parse -> preview -> confirm flow
- [ ] Add row-level validation with error categories (schema, mapping, business rule)
- [ ] Add deduplication fingerprint per normalized row to prevent duplicates
- [ ] Support partial-success imports with downloadable error report

### Phase 10.4 - Persistence and auditing

- [ ] Persist import batch metadata (provider, filename, totals, failures, actor, timestamp)
- [ ] Link imported entries to batch id for traceability
- [ ] Store original row hash for reproducibility and dedup checks
- [ ] Add import history page with batch status and details

### Phase 10.5 - Export features

- [ ] Add unified entries export to normalized CSV
- [ ] Add optional provider-shaped export format (future-proof adapter interface)
- [ ] Include deterministic formatting (locale-safe numeric/date export)
- [ ] Add export filtering by date range/asset/operation

### Phase 10.6 - UX and localization

- [ ] Add Import/Export section in entries workspace
- [ ] Show provider templates/instructions and sample files
- [ ] Show clear warning for unsupported provider files
- [ ] Localize import/export flows, errors, and status toasts (`en` + `pl`)

### Phase 10.7 - Testing and acceptance

- [ ] Add fixture-based parser tests for Kraken/ZondaCrypto/Binance samples
- [ ] Add pipeline tests for preview, confirm, dedup, and partial failure
- [ ] Add export snapshot tests for deterministic output
- [ ] Validate plan-limit integration with Phase 9 entitlement checks

### Phase 10.8 - Strict implementation order

- [ ] Milestone 10-M1: `10.1` (canonical model and mapping contracts)
- [ ] Milestone 10-M2: `10.2` (provider parsers and file decoding)
- [ ] Milestone 10-M3: `10.3 -> 10.4` (import execution + auditability)
- [ ] Milestone 10-M4: `10.5` (deterministic export capability)
- [ ] Milestone 10-M5: `10.6 -> 10.7` (UX localization, test coverage, and sign-off)

### Cross-phase strict order (Phase 9 + 10)

- [ ] Step 1: Complete Phase 9 Milestones `9-M1` and `9-M2`
- [ ] Step 2: Complete Phase 10 Milestones `10-M1` and `10-M2`
- [ ] Step 3: Complete Phase 9 Milestone `9-M3` (entitlement guards before import rollout)
- [ ] Step 4: Complete Phase 10 Milestones `10-M3` and `10-M4`
- [ ] Step 5: Complete Phase 9 Milestone `9-M4` and Phase 10 Milestone `10-M5`
- [ ] Step 6: Complete Phase 9 Milestone `9-M5` and run final acceptance checks

### Phase 11 — Administration Panel

- [x] Add `users.role` enum (`user | admin`) with default `user`
- [x] Add `ADMIN_EMAIL_ALLOWLIST` env (comma-separated) for admin bootstrap
- [x] Promote allowlisted users to admin on login/session provisioning
- [x] Add `users.lastLoginAt` and update on successful login
- [x] Build admin-only middleware/guard for `(admin)` routes
- [x] Create admin dashboard layout and navigation shell
- [x] Add user management interface:
  - [x] View all users (active/deleted)
  - [x] Search and filter users
  - [x] View user details and activity
  - [x] Soft delete/restore user accounts
  - [x] Purge entries for a user without deleting the account
  - [x] View user entries (read-only)
- [x] Add system monitoring (reuse dashboard chart stack):
  - [x] User registration metrics
  - [x] Active users statistics (based on `lastLoginAt`)
  - [x] Entry creation trends
  - [x] Deletion feedback trends by reason/date
- [x] Add feedback review panel:
  - [x] View all account deletion feedback
  - [x] Filter by reason and date
  - [x] Export feedback for analysis
- [x] Add admin activity audit log
- [x] Add tests for admin authorization and actions

### Phase 12 — Data Encryption for Entries

- [x] Finalize scope and threat model:
  - [x] Encrypt all entry fields except `date` (kept plaintext for range filtering)
  - [x] Leave profile fields unencrypted
  - [x] Confirm server-side filtering only by `userId` + `date`
- [x] Define crypto primitives and key hierarchy:
  - [x] Use `AES-256-GCM` for authenticated encryption
  - [x] Generate per-user DEK and wrap with `ENTRY_KEK` (env var)
  - [x] Add encryption versioning for future rotations
- [x] Implement encryption layer:
  - [x] Add `encryptPayload` / `decryptPayload` utilities
  - [x] Store wrapped DEK on user record
  - [x] Support nonce + tag storage (packed or structured)
- [x] Update schema and data model:
  - [x] Add `users.encryptionKeyEncrypted` + `users.encryptionVersion`
  - [x] Add `entries.encryptedPayload` + `entries.encryptionVersion`
  - [x] Keep `entries.date` plaintext; all other entry fields encrypted
- [x] Update entry CRUD operations:
  - [x] Encrypt entries on creation/update
  - [x] Decrypt entries on read
  - [x] Migrate existing unencrypted entries to encrypted payloads
- [x] Update query and aggregation logic:
  - [x] Fetch by `userId` + `date` only
  - [x] Perform filters, summaries, and dashboard aggregations post-decrypt
- [x] Add key rotation + recovery flows:
  - [x] Rewrap DEKs when `ENTRY_KEK` changes
  - [x] Re-encrypt user entries when rotating DEK
  - [x] Define recovery/lockout behavior if KEK is missing
- [x] Update backup and export features:
  - [x] Ensure backups store only encrypted entry payloads
  - [x] Provide decrypted exports on demand
- [x] Add tests:
  - [x] Encrypt/decrypt roundtrip + tamper detection
  - [x] KEK/DEK unwrap failures
  - [x] Migration correctness
  - [x] Aggregation correctness post-decrypt
- [x] Document encryption approach and recovery procedures

## Phase 13 - Internationalization

### Phase 13.1 - Foundation and locale strategy (cookie-based)

- [x] Confirm initial locales: `en` + `pl`
- [x] Adopt cookie-based locale storage for the authenticated app (no locale URL prefixes)
- [x] Add i18n library and wiring (recommended: `next-intl`)
- [x] Add locale detection order: cookie -> user profile preference (optional) -> default `en`
- [x] Add fallback behavior for missing translations (warn in non-prod, safe fallback in prod)

### Phase 13.2 - Message catalog architecture

- [x] Create locale message catalogs (`messages/en/*.json`, `messages/pl/*.json`)
- [x] Define namespaces: `common`, `auth`, `entries`, `dashboard`, `profile`, `admin`, `validation`, `metadata`
- [x] Add key naming conventions and ownership guidelines
- [x] Add checks/scripts for missing and unused translation keys

### Phase 13.3 - App shell and switching

- [x] Wrap root providers/layout with i18n provider and current locale
- [x] Add language switcher in app navigation/profile settings
- [x] Persist language changes to cookie and apply immediately
- [x] Ensure auth redirects and protected routes preserve selected locale from cookie

### Phase 13.4 - User-facing UI translation rollout

- [x] Translate auth pages and components (`/login`, `/register`, OAuth section)
- [x] Translate entries page, filters, dialogs, table labels, toasts, and empty states
- [x] Translate dashboard labels, filters, cards, charts, and empty states
- [x] Translate profile, delete-account flow, and goodbye screen
- [x] Translate shared layout labels (navbar, buttons, generic UI copy)

### Phase 13.5 - Admin area translation rollout

- [x] Translate admin navigation, users tables, filters, dialogs, and action labels
- [x] Translate admin feedback and audit screens
- [x] Translate admin analytics labels and empty states
- [x] Keep enum/database values stable; translate display labels only

### Phase 13.6 - Locale-aware formatting and metadata

- [x] Refactor formatting helpers to use active locale (number/currency/date presentation)
- [x] Keep accounting precision and backend calculations locale-agnostic
- [x] Localize per-route metadata titles/descriptions where applicable
- [x] Verify `html lang` reflects selected locale

### Phase 13.7 - Validation and server message localization

- [x] Externalize user-facing validation messages (zod/forms)
- [x] Standardize server action/API error keys and translate in the UI layer
- [x] Ensure toasts, confirmation dialogs, and inline errors are localized consistently

### Phase 13.8 - Testing and QA

- [x] Update existing tests to avoid brittle hardcoded copy when appropriate
- [x] Add tests for locale switching and cookie persistence
- [x] Add tests for translation fallback and missing keys behavior
- [x] Add tests for locale-specific formatting output
- [x] Run smoke checks for key flows in both `en` and `pl`

### Phase 13.9 - Rollout and docs

- [x] Release with `en` default and `pl` enabled
- [x] Add migration notes for remaining hardcoded strings
- [x] Document translator/developer workflow for future features
- [x] Define approach for adding future locales

### Phase 13.10 - Post-domain metadata (later)

- [ ] Set `metadataBase` to production URL
- [ ] Set `openGraph.url` and canonical URLs
- [ ] Replace placeholder social images with branded assets
- [ ] Revisit robots policy for production
- [ ] Swap placeholder icons (`icon.svg`, `apple-touch-icon.svg`, `og-placeholder.svg`) for branded assets
- [ ] Review sitemap outputs once public routes finalize (may need adjustments)
- [ ] Verify rendered metadata for key routes
- [ ] Validate Open Graph/Twitter tags

## Phase 14 - Polish Integrations (later phase)

### Phase 14.1 - Scope and policy (PL-only)

- [x] Define country-aware integration policy (`country -> provider`) for FX, tax validation, and bank imports
- [x] Limit rollout scope to Polish residents (`PL`) only
- [x] Keep this phase focused on integrations and auditability (exclude deep local e-filing APIs)
- [x] Add feature flags for incremental country rollout

### Phase 14.2 - Provider adapters (official sources first)

- [x] Add `RateProvider` adapter interface (`getRate`, `getLatest`, `getMetadata`)
- [x] Add `TaxValidationProvider` interface (`validate(id, country)`)
- [x] Add `NBP` adapter for Polish FX workflows
- [x] Add EU `VIES` VAT ID validation adapter

### Phase 14.3 - Data model and auditability

- [x] Extend FX persistence with: `rateValue`, `sourceProvider`, `publishedAt`, `retrievedAt`, `rateType`, `method`
- [x] Persist provider response snapshot/hash for reproducibility and audit
- [ ] Add effective-date normalization rules (weekend/holiday/business-day fallback)
- [x] Keep historical rates immutable once stored

### Phase 14.4 - Resilience and fallback behavior

- [x] Add strict timeouts + retry with exponential backoff for provider calls
- [x] Define per-country fallback chain (official -> cached prior valid -> user warning)
- [x] Add cache TTL strategy for latest rates and immutable cache for historical rates
- [x] Add stale-rate and provider-downtime alerting

### Phase 14.5 - Banking integrations

- [x] Integrate one open-banking aggregator (`GoCardless Bank Account Data`) for Polish users
- [x] Build normalized transaction ingestion pipeline for aggregator data
- [x] Maintain robust CSV import fallback when aggregator is unavailable

### Phase 14.6 - Product and UX updates

- [ ] Show FX source attribution in UI (provider + publication period/date)
- [ ] Surface explicit warnings when fallback rates are used
- [ ] Add admin control to lock provider policy per entity/country

### Phase 14.7 - Rollout order

- [ ] Step 1: `NBP + VIES`
- [ ] Step 2: Banking aggregator + CSV fallback
- [ ] Step 3: Harden telemetry, alert thresholds, and operational runbooks

### Phase 14.8 - Acceptance criteria

- [ ] Every FX conversion is reproducible and includes source metadata
- [ ] Country policy auto-selects expected provider
- [ ] EU VAT ID validation is available and logged
- [ ] Bank import works via one aggregator and CSV fallback
- [ ] Monitoring reports fallback usage spikes and stale-rate conditions

## Phase 15 - Domain and deployment topology (landing + app)

### Phase 15.1 - Domain strategy

- [ ] Confirm production host split: `logr.space` for landing website, `app.logr.space` for authenticated app
- [ ] Keep one brand across both hosts while separating marketing and product concerns

### Phase 15.2 - DNS and hosting setup

- [ ] Configure DNS records at domain provider for root (`@`) and `app` subdomain
- [ ] Map `logr.space` and `app.logr.space` to correct hosting project(s)
- [ ] Enable HTTPS certificates for both hosts and verify renewal

### Phase 15.3 - App configuration

- [ ] Set production `NEXTAUTH_URL=https://app.logr.space`
- [ ] Keep `NEXTAUTH_SECRET` configured in production environment
- [ ] Update OAuth redirect URLs to `https://app.logr.space/api/auth/callback/{provider}`
- [ ] Verify auth cookie/session behavior on `app.logr.space`

### Phase 15.4 - Routing and middleware checks

- [ ] Keep app routes on `app.logr.space` without route-path refactor (current default)
- [ ] Verify middleware matchers and sign-in redirects behave correctly under subdomain deployment
- [ ] Validate deep links and post-login redirects from landing to app

### Phase 15.5 - QA and launch checklist

- [ ] Smoke test login/register/session flows on production host
- [ ] Verify metadata/canonical URLs use final public hosts
- [ ] Add rollback plan for DNS cutover window

## Phase 16 - Integration Consumption (post-foundation)

### Phase 16.1 - Tax report integration

- [ ] Use Phase 14 rate service in tax report generation flows
- [ ] Include provider/method/effective date/source metadata in tax exports
- [ ] Ensure report output remains deterministic and reproducible from persisted snapshots

### Phase 16.2 - Import pipeline enrichment

- [ ] Apply country/provider policy resolution during import normalization
- [ ] Attach integration metadata to imported transaction records
- [ ] Add fallback and warning markers for import-time rate gaps

### Phase 16.3 - Optional live UI attribution

- [ ] Add source attribution badges (provider + method + date) on key financial surfaces
- [ ] Show explicit warnings when fallback rates are used
- [ ] Keep attribution concise and aligned with existing dashboard/entries visual language

---

## 11) MVP Acceptance Criteria

- User can register and log in
- User can add a transaction entry
- PLN value is calculated using correct NBP rate
- Entries are listed and filterable by date
- Summary correctly shows holdings and PnL
- User can delete their account safely

---

## 12) Example Entry

| Date       | Operation | Asset / Currency | Quantity | Price | Full | Commission | Source   | NBP    | Value (PLN) |
| ---------- | --------- | ---------------- | -------- | ----- | ---- | ---------- | -------- | ------ | ----------- |
| 2025-10-28 | BUY       | SOL / EUR        | 2 SOL    | 180   | 360  | 5          | PKO–SEPA | 4.2586 | 1533.10     |

---

**Logr** is intentionally simple: every transaction is just an entry — precise, traceable, and complete.
