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
- Asset distribution

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

- [ ] Entry creation
- [ ] NBP rate resolution
- [ ] PLN valuation

### Phase 4 — Entries UI

- [ ] Table
- [ ] Filters
- [ ] Add entry dialog

### Phase 5 — Summary

- [ ] Aggregations
- [ ] Holdings calculation

### Phase 6 — Profile

- [ ] Account data
- [ ] Account deletion

### Phase 7 — Dashboard (optional)

- [ ] Dashboard UI

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

| Date       | Operation | Asset / Currency | Quantity | Price | Full | Commission | Source   | NBP   | Value (PLN) |
|------------|----------|------------------|----------|-------|------|------------|----------|-------|-------------|
| 2025-10-28 | BUY      | SOL / EUR        | 2 SOL    | 180   | 360  | 5          | PKO–SEPA | 4.2586 | 1533.10 |

---

**Entry** is intentionally simple: every transaction is just an entry — precise, traceable, and complete.
