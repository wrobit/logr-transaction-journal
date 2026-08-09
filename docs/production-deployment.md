# Production deployment checklist

Target: `app.logr.space`. Public registration remains disabled until every blocking item below is complete.

## Infrastructure

- [ ] Confirm the expected use is eligible for Vercel Hobby; upgrade when it is not.
- [ ] Create an isolated Neon production branch plus synthetic-data development and preview branches.
- [ ] Create a least-privilege pooled runtime role and a separate direct-connection migration role.
- [ ] Configure Vercel from `.env.example`; do not add `MIGRATION_DATABASE_URL` to runtime variables.
- [ ] Register exact Google and GitHub callbacks:
  - `https://app.logr.space/api/auth/callback/google`
  - `https://app.logr.space/api/auth/callback/github`
- [ ] Create separate production/preview OAuth apps and Turnstile widgets with exact host allowlists.
- [ ] Configure Upstash limits, consented Analytics, and optional Sentry EU. Keep replay and request bodies disabled.
- [ ] Create a private R2 Standard bucket. Apply lifecycle rules: 14 daily and 8 weekly objects for both dump and checksum prefixes.
- [ ] Give the backup workflow a read-only Postgres role and write-only R2 credentials. Store the age private key offline only.
- [ ] Configure UptimeRobot to check `https://app.logr.space/api/health` every five minutes.

## Pre-release

- [ ] Lower DNS TTL and add `app.logr.space` to Vercel.
- [ ] Deploy the exact release commit to a preview using synthetic data and production-equivalent settings.
- [ ] Set `CSP_REPORT_ONLY=true`, exercise all flows, review violations, then set it to `false` before production.
- [ ] Run the CI workflow and the manual preview security scan. Accept no critical/high production audit findings without a documented owner and expiry.
- [ ] Apply `drizzle/0011_security_hardening.sql` to an isolated clone first. It intentionally removes legacy plaintext import audit data.
- [ ] Test expand/contract migration compatibility and prepare a forward fix; do not depend on destructive rollback.
- [ ] Run the backup workflow, decrypt offline, verify its SHA-256 checksum, restore into an isolated Neon branch, and test entry decryption/import/export.
- [ ] Record restore duration. Recovery objective: at most 24 hours of data loss; document the achieved restore-time target.

## Release and smoke test

- [ ] Apply migrations with the migration credential, then deploy the exact tested commit.
- [ ] Verify DNS, HTTPS, HSTS, enforced CSP, `nosniff`, framing denial, referrer/permissions policies, canonical metadata, and robots behavior.
- [ ] Test EN and PL flows: Google/GitHub signup and return login, logout, entry CRUD, CSV import/export, dashboard, tax JSON/CSV/PDF, profile, hard deletion, admin metadata, consent rejection, and rate fallback.
- [ ] Confirm admins cannot retrieve journal payloads or data-encryption keys.
- [ ] Confirm rate limits, Turnstile, `/api/health`, backup alerts, and error monitoring work, then set `PUBLIC_REGISTRATION_ENABLED=true` and redeploy.
- [ ] Monitor authentication failures, rate-limit events, DB latency, import failures, 5xx responses, and backup completion for 24 hours and review after seven days.

## Rollback

- Application regression: promote the previous schema-compatible Vercel deployment.
- Migration regression: use a forward fix. Never roll code back across an incompatible schema.
- Data corruption: disable writes, restore the latest clean encrypted dump to a new Neon branch, verify it, and switch the runtime URL.
- Secret exposure: revoke, redeploy, invalidate sessions, and follow `docs/security-runbook.md`. Never rotate `ENTRY_KEK` without a verified rewrap and recovery path.
