# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Overview

µapps: monorepo of small Cloudflare Workers apps (`workers/*`) + shared
internal packages (`packages/*`); Bun workspaces + Turborepo. Runtime/package
manager: **Bun** (not Node/npm/pnpm/yarn) — use `bun` for everything.

| App           | Directory              | URL                              |
| ------------- | ---------------------- | -------------------------------- |
| Link App      | `workers/link-app`     | <https://link.maxmilton.com>     |
| Ping Service  | `workers/ping-service` | -                                |
| Viewport Info | `workers/viewport-app` | <https://viewport.maxmilton.com> |

## Common commands

Use bun for all commands & dev, not node. Use bunx, not npx.

Run from repo root unless noted; Turborepo fans out to each workspace,
caches results.

```sh
bun install --frozen-lockfile   # install deps (CI uses frozen lockfile)
bun run build                   # turbo build — builds all packages/workers
bun run dev                     # build with NODE_ENV=development
bun run typegen                 # turbo typegen — regenerates wrangler types (worker-configuration.d.ts)
bun run lint                    # runs all lint:* tasks via turbo
bun run test                    # bun test --only-failures (fast local loop)
bun run test:ci                 # bun test --coverage --randomize --rerun-each=3 (what CI runs)
```

Individual lint tasks (all run by `bun run lint`):

```sh
bun run lint:css   # stylelint '**/*.{css,xcss}'
bun run lint:fmt   # oxfmt --check
bun run lint:fmt2  # biome check
bun run lint:js    # oxlint
bun run lint:ts    # tsc --build --noEmit (project references, incremental)
```

Run a single test file or test by name via Bun's test runner:

```sh
bun test workers/viewport-app/test/App.test.ts
bun test -t "rendered DOM matches snapshot"
```

Per-workspace scripts (run inside `workers/<app>/`, or via
`turbo run <script> --filter=@uapps/<name>` from root):

```sh
bun run build    # NODE_ENV=production bun build.ts (each app has its own build.ts)
bun run dev      # NODE_ENV=development bun build.ts
bun run serve    # wrangler dev — run the worker locally
bun run typegen  # wrangler types + fix-worker-type.ts (link-app, ping-service only)
bun run deploy:check   # wrangler deploy --dry-run
bun run deploy         # wrangler deploy (CI-only in practice, needs CLOUDFLARE_* secrets)
```

Frontend build asserts `Bun.env.ENV` + a 22-char
`Bun.env.FRONTEND_BUGBOX_API_KEY` — hard-fails without them. Supplied via
per-worker `.env` / `.env.development` / `.env.local` (gitignored);
`ping-service` uses `.dev.vars` instead.

CI (`.github/workflows/ci.yml`): test job runs `bun run build` then
`bun run test:ci`; lint job runs `bun run typegen && bun run build && bun run lint`
— build must precede lint since `lint:ts` needs generated types
(`worker-configuration.d.ts`) and build artifacts. Deploy
(`.github/workflows/deploy.yml`) runs only after CI succeeds on `master`:
`bun turbo deploy:check` then `bun turbo deploy`.

## Architecture

### Workspace layout

- `workers/*` — deployable Cloudflare Workers apps, each independent with own
  `wrangler.jsonc`, `build.ts`, `src/`. Shapes differ, don't assume symmetry:
  - `link-app` — worker (`src/worker.ts`) + stage1 frontend (`src/index.ts`),
    builds `index.html` + `404.html`, D1 binding `DB` (`schema.sql`), tests.
  - `ping-service` — worker only, no frontend/xcss/tests. Hourly cron trigger
    and secrets-store bindings in `wrangler.jsonc`.
  - `viewport-app` — frontend only, **no** `main` in `wrangler.jsonc` (static
    assets only), so no `worker-configuration.d.ts`/`typegen`. Tests +
    snapshots.
- `packages/*` — internal-only shared libraries (`private: true`, referenced
  via `workspace:*`), consumed only by `workers/*`:
  - `@uapps/build-tools` — shared production build pipeline: minifies
    Bun.build() output for HTML (swc/html), JS (swc minify), CSS
    (lightningcss + PurgeCSS), re-exports `xcss` Bun plugin.
  - `@uapps/git-info` — thin `git` CLI wrappers (`Bun.spawnSync`) embedding
    commit hash/ref/dirty-state into build output (cache-busting/release
    strings).
  - `@uapps/http-status-codes` — typed HTTP status code enum.

### Build system

Each worker has its own `build.ts` (run directly via `bun build.ts`, not a
bundler config file) that:

1. Wipes `dist/`, copies `static/` into it.
2. Runs `Bun.build()` per entrypoint the app has — worker (`src/worker.ts`,
   `cloudflare:*` external, unbundled — `no_bundle: true` in wrangler.jsonc)
   and/or frontend app (`src/index.ts`, target `browser`, content-hashed
   filenames in production).
3. Hand-assembles `dist/index.html` (+ `dist/404.html` in link-app)
   referencing hashed JS/CSS output (no HTML templating library — template
   literal).
4. In production mode (`NODE_ENV !== development`), runs `@uapps/build-tools`
   `minify()` over build artifacts (worker and frontend output both). Note:
   `minify()` deliberately ignores `Bun.BuildArtifact.sourcemap` and looks up
   `<path>.map` in the artifacts instead — bun mispairs that field when a build
   emits a CSS asset, and writing to it clobbers the CSS. Don't "simplify" it.
5. Writes `dist/build-info.json` with git ref, mode, asset filenames.

Frontend styling uses **ekscss (xcss)** — `.xcss` files compiled via Bun
plugin (`xcss` from `@uapps/build-tools`, configured per-app in
`xcss.config.js`), post-processed with PurgeCSS + lightningcss in production
builds.

Frontend UI uses **stage1** (`stage1/fast`), minimal component/DOM library
(`create`, `append`, etc. — see `src/router.ts`, `src/components/*.ts`), not
React/Vue/etc.

Workers use Cloudflare's static-assets model (`assets.directory` in
`wrangler.jsonc`), `main` pointing at built `dist/worker.js` for server-side
logic (API routes, D1, etc). `link-app` binds D1 (`DB`); check each worker's
`wrangler.jsonc` for bindings before adding new ones.

Per-worker `worker-configuration.d.ts` is generated (`wrangler types`/
`bun run typegen`) — don't hand-edit; regenerate when `wrangler.jsonc`
bindings change. `typegen` also runs
`packages/build-tools/src/fix-worker-type.ts`, rewriting generated
`import("./dist/worker")` to `import("./src/worker")` (workaround for broken
wrangler output).

`dist/` artifacts and generated types are inputs to `lint:ts` and to some
tests — build before linting/testing, as CI does.

### TypeScript project structure

- `tsconfig.base.json` holds shared strict compiler options; workspace
  `tsconfig.json` files extend it.
- Root `tsconfig.json` uses project references covering the three workers
  plus `tsconfig.bun.json` (internal packages/build scripts) and
  `tsconfig.node.json`. `lint:ts` runs `tsc --build` (TypeScript 7) across
  all.
- Workers use import aliases: `"#*": "./src/*"` in each worker's
  `package.json` `imports` field (e.g. `import { Status } from "#net.ts"`
  inside `link-app`).

### Testing

- Test runner `bun:test` (not Jest/Vitest). Global setup: `test/setup.ts`
  (root, preloaded via `bunfig.toml` `[test].preload`) — stubs `.xcss`
  imports to empty CSS, sets up `happy-dom` per test via
  `@maxmilton/test-utils`.
- DOM tests use `@maxmilton/test-utils/dom` (`render`, `cleanup`) against
  happy-dom, with `afterEach(cleanup)`.
- Some tests use `toMatchSnapshot()` (see `__snapshots__/`).
- `test:ci` runs `--randomize --rerun-each=3` to catch order-dependent/flaky
  tests — write tests independent of execution order/shared mutable state.

### Linting — multiple tools, each distinct job

Don't assume one tool covers everything; `bun run lint` runs all, CI too:

- **oxfmt** (`lint:fmt`) — the JS/TS formatter (config: `.oxfmtrc.jsonc`).
- **biome** (`lint:fmt2`) — linting + non-JS formatting (config: `biome.jsonc`,
  100-char line width; `noNonNullAssertion`/`useTemplate`/
  `noAssignInExpressions`/`noConstEnum` intentionally allowed). JS formatter
  deliberately disabled — oxfmt owns that.
- **oxlint** (`lint:js`) — fast primary linter (config: `.oxlintrc.jsonc`),
  type-aware (`typeAware: true`, via `oxlint-tsgolint`), extends
  `@maxmilton/oxlint-config` presets including `stage1`-specific preset for
  frontend files. `correctness`, `suspicious`, `perf`, `restriction` are
  errors.
- **stylelint** (`lint:css`) — for `.css`/`.xcss` files.
- **tsc** (`lint:ts`) — type checking only (`noEmit`), not used for
  transpilation (Bun/swc handle that).

`noUnusedLocals`/`noUnusedParameters`/`noFallthroughCasesInSwitch`
deliberately left to linters, not tsc, per `tsconfig.base.json` comments.

### Other conventions

- `bunfig.toml`'s `install.minimumReleaseAge` delays new dependency versions
  by 7 days (except `@maxmilton/*`, `bugbox`, `stage1`) as a supply-chain
  safety margin — relevant if `bun install` seems to ignore a just-published
  version. Also `linker = "isolated"`, `auto = "disable"`.
- `.bak` files/dirs scattered around repo (e.g. `src/index.ts.bak`,
  `_ARCHIVE.bak/`) are inactive backups, not part of build — don't treat as
  source.
