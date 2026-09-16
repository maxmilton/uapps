Monorepo of micro apps.

## Commands

Use bun not node, bunx not npx.

```sh
bun run build  # production
bun dev        # unminified
bun lint       # lint:fmt (oxfmt), lint:fmt2 (biome), lint:css (stylelint), lint:js (oxlint), lint:ts (tsc)
bun test       # all
bun test test/example.test.ts # one file
bun test -t "name pattern"    # one case
bun test:ci    # coverage + catch flakiness
bun turbo deploy:check # dry run
bun --filter @uapps/link-app run serve  # serve one worker locally
```

## Constraints

- Run `bun run build` before `bun test`; tests read `dist/`.
- Never deploy unless explicitly requested.
