# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when work code this repo.

## Overview

µapps = monorepo, small Cloudflare Workers apps (`workers/*`) plus shared
internal packages (`packages/*`), managed with Bun workspaces and Turborepo.
Runtime and package manager: **Bun** (not Node/npm/pnpm/yarn) — use `bun`
for everything (install, run, test, build).

## Common commands

Use bun for all commands & dev, not node. Use bunx, not npx.

Run from repo root unless noted. Turborepo fans these out to each
workspace, caches results.

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
bun run lint:fmt   # biome check
bun run lint:js    # oxlint
bun run lint:js2   # eslint
bun run lint:ts    # tsc --build --noEmit (project references, incremental)
```

Run single test file or test by name with Bun's test runner direct:

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
bun run typegen  # wrangler types — generate worker-configuration.d.ts from wrangler.jsonc
bun run deploy:check   # wrangler deploy --dry-run
bun run deploy         # wrangler deploy (CI-only in practice, needs CLOUDFLARE_* secrets)
```

CI (`.github/workflows/ci.yml`) runs `bun run build` then `bun run test:ci`
for test job, and `bun run typegen && bun run build && bun run lint` for
lint job — build must succeed before lint since generated types
(`worker-configuration.d.ts`) and build artifacts required for
type-checking. Deploy (`.github/workflows/deploy.yml`) only runs after CI
succeeds on `master`, does `bun turbo deploy:check` then `bun turbo deploy`.

## Architecture

### Workspace layout

- `workers/*` — deployable Cloudflare Workers apps. Each independent, own
  `wrangler.jsonc`, `build.ts`, `src/`, `test/`.
- `packages/*` — internal-only shared libraries (`private: true`, referenced
  via `workspace:*`), consumed only by `workers/*`:
  - `@uapps/build-tools` — shared production build pipeline: minifies
    Bun.build() output for HTML (swc/html), JS (swc minify), CSS
    (lightningcss + PurgeCSS), re-exports `xcss` Bun plugin.
  - `@uapps/git-info` — thin wrappers around `git` CLI calls (`Bun.spawnSync`)
    to embed commit hash/ref/dirty-state into build output (used for
    cache-busting/release strings).
  - `@uapps/http-status-codes` — typed HTTP status code enum.

### Build system

Each worker has own `build.ts` script (run direct with `bun build.ts`,
not bundler config file) that:

1. Wipes `dist/`, copies `static/` into it.
2. Runs `Bun.build()` for worker entrypoint (`src/worker.ts`, target
   `cloudflare:*` external, unbundled — `no_bundle: true` in wrangler.jsonc)
   and separately for frontend app entrypoint (`src/index.ts`, target
   `browser`, content-hashed filenames in production).
3. Hand-assembles `dist/index.html` / `dist/404.html` referencing hashed
   JS/CSS output (no HTML templating library — template literal).
4. In production mode (`NODE_ENV !== development`), runs `@uapps/build-tools`
   `minify()` over build artifacts.
5. Writes `dist/build-info.json` with git ref, mode, asset filenames.

Frontend styling uses **ekscss (xcss)** — `.xcss` files compiled via Bun
plugin (`xcss` from `@uapps/build-tools`, configured per-app in
`xcss.config.js`), post-processed with PurgeCSS + lightningcss in production
builds.

Frontend UI uses **stage1** (`stage1/fast`), minimal component/DOM library
(`create`, `append`, etc. — see `src/router.ts`, `src/components/*.ts`), not
React/Vue/etc.

Workers use Cloudflare's static-assets model (`assets.directory` in
`wrangler.jsonc`) with `main` pointing at built `dist/worker.js` for
server-side logic (API routes, D1 access, etc.). `link-app` binds D1
database (`DB`); check `wrangler.jsonc` per-worker for bindings before adding
new ones.

Per-worker `worker-configuration.d.ts` generated output (`wrangler
types`/`bun run typegen`) — don't hand-edit, regenerate instead when
`wrangler.jsonc` bindings change.

### TypeScript project structure

- `tsconfig.base.json` holds shared strict compiler options; workspace
  `tsconfig.json` files extend it.
- Root `tsconfig.json` uses project references (`references: [...]`) covering
  each worker plus `tsconfig.bun.json` (internal packages / build scripts)
  and `tsconfig.node.json`. `lint:ts` runs `tsc --build` across all of them.
- Workers use import aliases: `"#*": "./src/*"` in each worker's
  `package.json` `imports` field (e.g. `import { Status } from "#net.ts"`
  inside `link-app`).

### Testing

- Test runner: `bun:test` (not Jest/Vitest). Global setup lives in
  `test/setup.ts` (root, preloaded via `bunfig.toml` `[test].preload`) — it
  stubs `.xcss` imports to empty CSS, sets up `happy-dom` per test via
  `@maxmilton/test-utils`.
- DOM tests use `@maxmilton/test-utils/dom` (`render`, `cleanup`) against
  happy-dom, with `afterEach(cleanup)`.
- Some tests use `toMatchSnapshot()` (see `__snapshots__/`).
- `test:ci` runs with `--randomize --rerun-each=3` to catch order-dependent
  and flaky tests — write tests not dependent on execution order or
  shared mutable state.

### Linting — multiple tools, each distinct job

Don't assume one tool covers everything; `bun run lint` runs all, CI too:

- **biome** (`lint:fmt`) — formatting + subset of linting (config:
  `biome.jsonc`, 100-char line width, `noNonNullAssertion` and `useTemplate`
  intentionally allowed).
- **oxlint** (`lint:js`) — fast primary linter (config: `.oxlintrc.json`),
  extends `@maxmilton/oxlint-config` presets including `stage1`-specific
  preset for frontend files. `perf` and `restriction` categories are errors.
- **eslint** (`lint:js2`) — supplementary rules oxlint doesn't cover yet
  (`eslint-plugin-oxlint` disables rules oxlint already handles, avoid
  duplicate reporting).
- **stylelint** (`lint:css`) — for `.css`/`.xcss` files.
- **tsc** (`lint:ts`) — type checking only (`noEmit`), not used for
  transpilation (Bun/swc handle that).

`noUnusedLocals`/`noUnusedParameters`/`noFallthroughCasesInSwitch`
deliberately left to linters, not tsc, per `tsconfig.base.json` comments.

### Other conventions

- Bun's `install.minimumReleaseAge` (`bunfig.toml`) delays adopting new
  dependency versions by 7 days (except `@maxmilton/*`) as supply-chain
  safety margin — relevant if `bun install` seems to ignore
  just-published version.
- `.bak` files scattered around repo (e.g. `src/index.ts.bak`,
  `package.json.bak`) inactive backups, not part of build — don't
  treat as source.
