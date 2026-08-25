<p align="center">
  <img src="public/logo.svg" alt="Logr" width="260" />
</p>

A minimal, personal crypto transaction journal focused on correctness, transparency, and accounting-style clarity. No hype, no trading features — just structured records, PLN valuation via NBP, and clear profit/loss.

## Table of contents

- [Introduction](#introduction)
- [Product Goals](#product-goals)
- [Core Principles](#core-principles)
- [Features](#features)
- [Business Rules](#business-rules)
- [Tech Stack](#tech-stack)
- [Data Model](#data-model)
- [Encryption](#encryption)
- [NBP Integration](#nbp-integration)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Support](#support)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Introduction

Logr is a personal crypto journal that treats each transaction as an immutable accounting entry. It emphasizes reproducible calculations, official PLN rates, and a clean UI designed for tracking and tax preparation.

## Product Goals

- Capture each transaction as a precise accounting entry
- Provide accurate PLN valuation using official NBP rates
- Offer a low-friction UI for personal tracking and tax prep
- Keep calculations deterministic and reproducible

## Core Principles

- One entry equals one immutable transaction record
- PLN value is always derived from NBP table A
- All financial calculations are deterministic
- Built for personal accounting, not trading analytics

## Features

### Entries (`/`)

- Date range filter
- Entries table with full financial breakdown
- Primary action: **Add entry**

### Summary (`/summary`)

- Total buy value (PLN)
- Total sell value (PLN)
- Total PnL (PLN)
- Holdings per asset (net quantity + PnL)

### Profile (`/profile`)

- Read-only user data
- Delete account flow with confirmation

### Dashboard (`/dashboard`)

- Optional visual overview (PnL trends, buy vs sell, asset distribution)

## Business Rules

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

## Tech Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Database**: Neon (PostgreSQL)
- **ORM**: Drizzle
- **UI**: shadcn/ui + Tailwind CSS
- **Auth**: NextAuth (Google and GitHub OAuth)
- **Validation**: zod
- **Charts (optional)**: Recharts or Chart.js

## Data Model

### `users`

- `id`, `email`, `login`, `role`
- `firstName`, `lastName`, `createdAt`, `updatedAt`
- `encryptionKeyEncrypted`, `encryptionVersion`

### `oauth_accounts`

- `userId`, `provider`, `providerAccountId`, `providerEmail`
- Unique provider identity; a verified provider email may claim an existing account only when it has no OAuth link yet

### `entries`

- `date` (plaintext for range filters)
- `encryptedPayload` (all entry fields except `date`)
- `encryptionVersion`, `createdAt`, `updatedAt`

### `fx_rates_cache`

- `currency`, `rateDate`, `rate`
- Unique constraint `(currency, rateDate)`

## Encryption

- Uses AES-256-GCM with per-user data keys (DEKs)
- `ENTRY_KEK` (32-byte base64) wraps each user DEK
- All entry fields are encrypted except `date`
- Missing/rotated KEK without rewrap makes data unrecoverable
- DEK rotation re-encrypts all entries for a user

## NBP Integration

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

## Project Structure

- `app/(auth)/login`
- `app/(auth)/register`
- `app/(protected)/page.tsx` (entries)
- `app/(protected)/summary`
- `app/(protected)/profile`
- `app/(protected)/dashboard`
- `components/entries/`
- `components/summary/`
- `components/profile/`
- `components/dashboard/`
- `lib/db/`
- `lib/nbp/`
- `lib/auth/`
- `lib/format/`
- `actions/entries.ts`
- `actions/summary.ts`
- `actions/profile.ts`

## Getting Started

Install dependencies and run the development server:

```bash
pnpm install
pnpm dev
```

## Environment Variables

Copy `.env.example` and configure the documented runtime, migration, OAuth, encryption,
Upstash, and Turnstile variables. Production startup validates all required values. Never
expose `MIGRATION_DATABASE_URL` to the application runtime.

See `docs/production-deployment.md` for the production checklist and
`docs/security-runbook.md` for key rotation and incident procedures.

## Support

Logr is open source and community-supported. All product features are free to use.
If the project saves you time or helps with your records, you can support ongoing
maintenance through the Buy Me a Coffee link exposed by `NEXT_PUBLIC_BUYMEACOFFEE_URL`.

## Contributing

Community contributions are welcome. Before opening a larger pull request, please
start with an issue or short proposal so the scope stays aligned with the project.

Useful contribution areas include:

- Bug fixes with a clear reproduction case
- Tests for financial calculations, import parsing, encryption, and formatting
- Documentation improvements
- Small UI and accessibility refinements

## License

MIT. See `LICENSE`.

## Contact

Contact me via e-mail: piotr.wrobel@quadrantive.com

Initialized with 🖤
