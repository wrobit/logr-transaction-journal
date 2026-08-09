# Repository Guidelines

## Project Structure & Module Organization

Logr is a Next.js App Router application. Route UI lives in `app/`, with protected,
auth, admin, and API areas organized by route segment. Reusable React components
live in `components/`, grouped by feature such as `entries`, `dashboard`, and
`ui`. Server actions are in `actions/`. Shared domain code, auth, encryption,
formatting, NBP integration, and database access live in `lib/`. Drizzle schema is
defined in `lib/db/schema.ts`, with generated migrations in `drizzle/`. Localized
copy is in `messages/en.json` and `messages/pl.json`. Static assets live in
`public/`. Tests and fixtures live under `test/`.

## Build, Test, and Development Commands

- `pnpm dev` runs the local Next.js server on port `2206`.
- `pnpm build` creates a production build.
- `pnpm start` serves the production build.
- `pnpm lint` runs Next.js ESLint checks.
- `pnpm type:check` runs `tsc --noEmit` with strict TypeScript settings.
- `pnpm i18n:check` verifies locale key consistency.
- `pnpm test` runs the Vitest suite.
- `pnpm db:generate`, `pnpm db:migrate`, and `pnpm db:studio` manage Drizzle
  migrations and inspection.

## Coding Style & Naming Conventions

Use TypeScript and React function components. Follow the existing 2-space
indentation, semicolons, double quotes, and 100-character print width from
`.prettierrc`. Prefer `@/` imports for repository modules. Keep domain logic in
`lib/`, mutation workflows in `actions/`, and UI state/rendering in components.
Name React components in PascalCase, hooks as `useSomething`, and test files as
`*.test.ts` or `*.test.tsx`.

## Testing Guidelines

Vitest runs in `jsdom` with setup in `test/setup.ts`. Place new tests in `test/`
near related fixtures or helpers. Use Testing Library for component behavior and
plain Vitest assertions for domain logic. Cover financial calculations, encryption,
import parsing, NBP/rate behavior, and locale-sensitive formatting when those areas
change. Run `pnpm test`, and for broad changes also run `pnpm lint`,
`pnpm type:check`, and `pnpm i18n:check`.

## Commit & Pull Request Guidelines

Recent history follows Conventional Commit-style subjects such as `feat: add csv
import logic`, `fix: assets panel empty values`, and `chore: add seed`. Keep
subjects imperative, scoped, and lowercase after the prefix. Pull requests should
include a short problem/solution summary, linked issue when available, testing
performed, and screenshots or recordings for visible UI changes.

## Security & Configuration Tips

Do not commit `.env*` files. Required runtime secrets include `DATABASE_URL` for
Neon/Postgres and `ENTRY_KEK` for encrypted user data. Treat encryption and database
reset commands with care; `pnpm db:reset` and `pnpm db:purge` can destroy data.
