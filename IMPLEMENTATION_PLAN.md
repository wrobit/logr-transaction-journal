# Entry — Crypto Journal
Implementation Plan (Next.js + TypeScript + Drizzle + Neon + shadcn/ui)

**Entry** is a minimal, personal crypto transaction journal focused on correctness, transparency, and accounting-style clarity.
No hype, no trading features — just structured records, PLN valuation via NBP, and clear profit/loss.

---

## 1) Tech Stack

- **Next.js (App Router)**
- **TypeScript**
- **Drizzle ORM**
- **Neon (PostgreSQL)**
- **shadcn/ui**
- **Auth**: NextAuth (Credentials provider)
- **Validation**: zod
- **Passwords**: bcrypt
- **Charts (optional)**: Recharts or Chart.js

---

## 2) Core Principles of Entry

- Every transaction is a **single immutable entry**
- PLN value is always derived from **official NBP rates**
- Calculations are deterministic and reproducible
- Designed for **personal tracking / tax preparation**, not trading

---

## 3) Business Rules

### PLN valuation (NBP)
- PLN rate is fetched from **NBP table A**
- Rate date logic:
  - Weekday → previous calendar day
  - Weekend → previous Friday
  - If NBP has no data (404) → step backwards day-by-day
- `valuePLN = fullPrice × nbpRate`
- If quote currency = PLN → `nbpRate = 1`

### Profit / Loss
- Calculated as:
PnL = Σ(sell.valuePLN) − Σ(buy.valuePLN)
- Commission stored explicitly and can be:
- included in buy cost / sell proceeds (default)
- or shown separately (future option)

---

## 4) Routes

### Public
- `/login`
- `/register`

### Protected

#### `/` — Entries (Main)
Transaction history and data entry.

Features:
- Date range filter
-_toggle future_: asset / operation filters
- Table of all transaction **entries**
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

---

#### `/summary` — Summary
High-level financial overview.

- Total buy value (PLN)
- Total sell value (PLN)
- Total PnL (PLN)
- Holdings per asset:
- Net quantity
- Buy PLN / Sell PLN / PnL PLN

---

#### `/profile` — Profile
User account management.

- Name
- Surname
- Login
- Email
- Delete account section:
- AlertDialog confirmation
- Optional text confirmation (“DELETE”)
- Cascading delete of all entries

---

#### `/dashboard` — Dashboard (optional)
Visual overview of data.

- PnL over time
- Buy vs Sell volume
- Asset distribution

---

## 5) Data Model (Drizzle + Postgres)

### `users`
- `id` (uuid, pk)
- `email` (text, unique)
- `login` (text, unique)
- `passwordHash` (text)
- `firstName` (text)
- `lastName` (text)
- `createdAt`
- `updatedAt`

---

### `entries`
(Core concept of the app)

- `id` (uuid, pk)
- `userId` (uuid, fk → users.id)
- `date` (date)
- `operation` (`BUY | SELL`)
- `baseAsset` (text) — e.g. BTC, SOL
- `quoteCurrency` (text) — USD, EUR, PLN
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

---

### `fx_rates_cache`
- `id` (uuid)
- `currency` (text)
- `rateDate` (date)
- `rate` (numeric(18,6))
- unique `(currency, rateDate)`

---

## 6) NBP Integration

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

## 7) UI Structure (shadcn/ui)

### Entries page
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

---

### Summary page
- Cards: Buy PLN / Sell PLN / PnL
- Holdings table

---

### Profile page
- Read-only user data
- Delete account `AlertDialog`

---

## 8) Project Structure

/app
/(auth)
login
register
/(protected)
page.tsx # entries
summary
profile
dashboard
/components
entries/
summary/
profile/
dashboard/
/lib
db/
nbp/
auth/
format/
actions
entries.ts
summary.ts
profile.ts


---

## 9) Implementation Phases

### Phase 1 — Foundation
- Project setup
- Drizzle + Neon
- shadcn/ui

### Phase 2 — Auth
- Register / login
- Session protection

### Phase 3 — Core Logic
- Entry creation
- NBP rate resolution
- PLN valuation

### Phase 4 — Entries UI
- Table
- Filters
- Add entry dialog

### Phase 5 — Summary
- Aggregations
- Holdings calculation

### Phase 6 — Profile
- Account data
- Account deletion

### Phase 7 — Dashboard (optional)

---

## 10) MVP Acceptance Criteria

- User can register and log in
- User can add a transaction **entry**
- PLN value is calculated using correct NBP rate
- Entries are listed and filterable by date
- Summary correctly shows holdings and PnL
- User can delete their account safely

---

## 11) Example Entry

| Date       | Operation | Asset / Currency | Quantity | Price | Full | Commission | Source        | NBP | Value (PLN) |
|------------|----------|------------------|----------|-------|------|------------|---------------|-----|-------------|
| 2025-10-28 | BUY      | SOL / EUR        | 2 SOL    | 180   | 360  | 5          | PKO–SEPA      | 4.2586 | 1533.10 |

---

**Entry** is intentionally simple:
every transaction is just an entry — precise, traceable, and complete.
