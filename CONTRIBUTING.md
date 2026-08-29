# Contributing

Thanks for contributing to Logr. For substantial changes, open an issue or short proposal before
implementation so the scope and accounting behavior can be agreed first.

## Development

Use Node.js 22 and pnpm 10. Follow the setup in [README.md](README.md), then run:

```bash
pnpm lint
pnpm type:check
pnpm i18n:check
pnpm test -- --run
pnpm build
```

Add focused tests for behavior changes, especially financial calculations, encryption, imports,
exchange rates, exports, and locale-sensitive formatting. Keep English and Polish message keys in
sync.

Use concise Conventional Commit subjects such as `fix(import): reject duplicate rows`. Pull
requests should explain the problem and solution, list the checks run, and include screenshots for
visible UI changes.
