# i18n Guidelines

## Key naming

- Use dot-separated namespaces: `domain.section.item`.
- Keep stable keys; update translation values, not key names.
- Prefer semantic names over UI location names.

## Ownership

- `messages/en.json` is the source catalog.
- `messages/pl.json` must mirror all keys from `messages/en.json`.
- Feature authors add new keys in both catalogs in the same PR.

## Validation and server errors

- Prefer stable server error keys and map to translated messages.
- Avoid embedding user-facing plain text in server actions where possible.

## Workflow

1. Add keys to `messages/en.json`.
2. Add corresponding keys to `messages/pl.json`.
3. Run `pnpm i18n:check`.
4. Verify key flows in both locales.
