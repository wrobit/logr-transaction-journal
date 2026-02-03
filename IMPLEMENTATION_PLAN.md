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

- [ ] Add profile fetch action (current user)
- [ ] Add profile update action (first/last/login/email)
- [ ] Add delete account action (cascade delete entries)

#### Phase 6.2 — Profile UI (Editable)

- [ ] Read-only summary section
- [ ] Minimal edit controls for profile fields
- [ ] Validation + inline errors

#### Phase 6.3 — Account Deletion Flow

- [ ] Lethal warning copy + consequences
- [ ] Require typing “DELETE” to confirm
- [ ] AlertDialog confirmation

#### Phase 6.4 — Goodbye Screen

- [ ] Post-delete confirmation screen
- [ ] “Why are you leaving?” options + freeform
- [ ] “I’ve changed my mind” CTA

#### Phase 6.5 — Tests

- [ ] Profile render + edit validation
- [ ] Delete confirmation requirement
- [ ] Goodbye screen rendering

### Phase 7 — Website Metadata & SEO

### Phase 8 — Subscriptions and payments with polarr

### Phase 9 — Import & Export with various providers

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
