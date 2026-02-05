# Entry — Crypto Journal

Implementation Plan (Next.js App Router + TypeScript + Drizzle + Neon + shadcn/ui)

**Entry** is a minimal, personal crypto transaction journal focused on correctness, transparency, and accounting-style clarity. No hype, no trading features — just structured records, PLN valuation via NBP, and clear profit/loss.

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

- Define Cursor-style layout (ENTRY top-left, centered content, dark canvas)
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
  - [x] Use “Entry — {Page}” titles + concise descriptions
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

### Phase 9 — Subscriptions and payments with polarr

### Phase 10 — Import & Export with various providers

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

- [ ] Finalize scope and threat model:
  - [ ] Encrypt all entry fields except `date` (kept plaintext for range filtering)
  - [ ] Leave profile fields unencrypted
  - [ ] Confirm server-side filtering only by `userId` + `date`
- [ ] Define crypto primitives and key hierarchy:
  - [ ] Use `AES-256-GCM` for authenticated encryption
  - [ ] Generate per-user DEK and wrap with `ENTRY_KEK` (env var)
  - [ ] Add encryption versioning for future rotations
- [ ] Implement encryption layer:
  - [ ] Add `encryptPayload` / `decryptPayload` utilities
  - [ ] Store wrapped DEK on user record
  - [ ] Support nonce + tag storage (packed or structured)
- [ ] Update schema and data model:
  - [ ] Add `users.encryptionKeyEncrypted` + `users.encryptionVersion`
  - [ ] Add `entries.encryptedPayload` + `entries.encryptionVersion`
  - [ ] Keep `entries.date` plaintext; all other entry fields encrypted
- [ ] Update entry CRUD operations:
  - [ ] Encrypt entries on creation/update
  - [ ] Decrypt entries on read
  - [ ] Migrate existing unencrypted entries to encrypted payloads
- [ ] Update query and aggregation logic:
  - [ ] Fetch by `userId` + `date` only
  - [ ] Perform filters, summaries, and dashboard aggregations post-decrypt
- [ ] Add key rotation + recovery flows:
  - [ ] Rewrap DEKs when `ENTRY_KEK` changes
  - [ ] Re-encrypt user entries when rotating DEK
  - [ ] Define recovery/lockout behavior if KEK is missing
- [ ] Update backup and export features:
  - [ ] Ensure backups store only encrypted entry payloads
  - [ ] Provide decrypted exports on demand
- [ ] Add tests:
  - [ ] Encrypt/decrypt roundtrip + tamper detection
  - [ ] KEK/DEK unwrap failures
  - [ ] Migration correctness
  - [ ] Aggregation correctness post-decrypt
- [ ] Document encryption approach and recovery procedures

## Phase 13 - Internationalization

### Post-domain metadata (later)

- [ ] Set `metadataBase` to production URL
- [ ] Set `openGraph.url` and canonical URLs
- [ ] Replace placeholder social images with branded assets
- [ ] Revisit robots policy for production
- [ ] Swap placeholder icons (`icon.svg`, `apple-touch-icon.svg`, `og-placeholder.svg`) for branded assets
- [ ] Review sitemap outputs once public routes finalize (may need adjustments)
- [ ] Verify rendered metadata for key routes
- [ ] Validate Open Graph/Twitter tags

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

**Entry** is intentionally simple: every transaction is just an entry — precise, traceable, and complete.
