# Minimal production deployment checklist

Target: `logr-transaction-journal-alpha.vercel.app`. Goal: launch a free-to-use beta with the least operational work while keeping auth, encryption, and recovery basics covered.

## 1. Accounts and runtime

- [x] Confirm the app is eligible for Vercel Hobby/free-tier use; upgrade or choose another host if not.
- [x] Create one Neon production database/branch on the free tier.
- [x] Configure Vercel production env vars from `.env.example`:
  - required app secrets: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `ENTRY_KEK`, `NEXT_PUBLIC_SITE_URL`
  - required auth: Google and GitHub OAuth credentials with callbacks for `https://logr-transaction-journal-alpha.vercel.app/api/auth/callback/google` and `https://logr-transaction-journal-alpha.vercel.app/api/auth/callback/github`
  - `PUBLIC_REGISTRATION_ENABLED=false` until smoke tests pass
- [x] Do **not** add `MIGRATION_DATABASE_URL` to Vercel runtime variables; use it only locally for migrations.
- [x] Store an offline copy of `ENTRY_KEK`; database backups are useless without it.

## 2. Deploy

- [ ] Confirm `logr-transaction-journal-alpha.vercel.app` is assigned to the production deployment.
- [ ] Run locally before release: `pnpm lint`, `pnpm type:check`, `pnpm i18n:check`, `pnpm test`, `pnpm build`.
- [ ] Apply Drizzle migrations to production using the migration connection.
- [ ] Deploy the tested commit to Vercel production.

## 3. Smoke test before opening registration

- [ ] Verify HTTPS and that `https://logr-transaction-journal-alpha.vercel.app/api/health` responds.
- [ ] Test Google signup/login, GitHub signup/login, logout, and blocked/allowed signup behavior.
- [ ] Test core user flows in EN and PL: entry create/edit/delete, dashboard, CSV import/export, tax export, profile, and hard deletion.
- [ ] Set `PUBLIC_REGISTRATION_ENABLED=true`, redeploy, and retest signup once.

## 4. Minimal operations after launch

- [ ] Watch Vercel logs, auth failures, 5xx responses, import failures, and Neon usage for the first 24 hours.
- [ ] Create a recurring manual backup habit until automated backups are worth the time: export/backup the Neon database and keep the matching `ENTRY_KEK` offline.
- [ ] If something breaks, first promote the previous compatible Vercel deployment. If data looks corrupted, disable writes and restore/switch to a verified Neon backup/branch.

## Deferred until the app needs more rigor

- Separate production/preview OAuth apps and databases.
- Least-privilege runtime and migration database roles.
- Automated encrypted R2 backups and restore drills.
- Signup rate limiting and bot protection if abuse becomes a problem.
- Sentry, consented Analytics, UptimeRobot, CSP report-only review, and manual security scanning.
- Full recovery-time/recovery-point objectives and seven-day post-launch review.
