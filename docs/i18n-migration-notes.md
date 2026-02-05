# i18n Migration Notes

## Remaining hardcoded copy hotspots

- Admin CSV export headers in `app/(admin)/admin/feedback/export/route.ts`.
- Selected backend-only error strings that are not rendered in UI flows.

## Follow-up policy

- Any new UI text must be added to `messages/en.json` and `messages/pl.json`.
- Any new server error returned to UI must use an i18n key in `messages/*`.

## Future locale expansion

1. Add new locale code to `APP_LOCALES` in `lib/i18n/config.ts`.
2. Add a catalog at `messages/<locale>.json` with full key parity.
3. Run `pnpm i18n:check`.
4. Add locale-specific QA snapshots for critical pages.
