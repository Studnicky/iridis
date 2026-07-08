# @studnicky/substrate adherence

Tracks adoption of every package published from the `@studnicky/substrate`
monorepo (GitHub Packages, `@studnicky:registry=https://npm.pkg.github.com`,
pinned in the root `.npmrc`). All 28 packages are installed at `4.0.0` in the
workspace root `package.json`. This table is the adherence checklist — update
the Status column as each package is wired into a consuming iridis package.

Status values: `adopted` (wired and in use) · `planned` (target package
identified, not yet wired) · `n/a` (reviewed, no fit in this workspace).

## Lint / build tooling

| Package | Status | Where |
|---|---|---|
| `@studnicky/eslint-config` | adopted | root `eslint.config.mjs` — full 31-rule set (16 `@studnicky/*` + 15 `@studnicky/v8/*`) plus stylistic/typescript-eslint/perfectionist/import-x/regexp/unused-imports, applied to `packages/*/src` and `site/app` |

## Core engine (`packages/core`)

`@studnicky/errors` and `@studnicky/json` supersessions are `planned`:
`@studnicky/errors` will replace ad hoc throws across `core`/`cli` (migration
plan: `docs/internal/errors-migration-plan.md`), and `@studnicky/json` will
replace the hand-rolled Ajv wrapper in `Validator.ts` (migration plan:
`docs/internal/json-validator-migration-plan.md`).

| Package | Status | Where | Notes |
|---|---|---|---|
| `@studnicky/pipeline` | planned | `core` engine | Input → derive → validate → emit is a sequential typed transform chain; matches `pipeline`'s shape directly |
| `@studnicky/json` | planned | `core`, `cli` | Deep merge/clone/equal/freeze/patch/hash for config merging, immutable `ColorRecord` handling, memo-key hashing; supersedes the hand-rolled Ajv wrapper in `Validator.ts` — see `docs/internal/json-validator-migration-plan.md` |
| `@studnicky/predicates` | planned | `core/src/types/validation.ts` | `ValidationErrorInterface`/`ValidationResultInterface` currently hand-rolled; replace with predicate-based type guards |
| `@studnicky/cache` | planned | `core` engine | Memoize expensive contrast/palette derivations (`ensureContrast` AAA-enforcement path) |
| `@studnicky/logger` | adopted | `core`, `cli`, `vscode`, and all other packages | Migration complete: `LoggerInterface` contract replaced, `ConsoleLogger.ts` rewritten, all 72 `ctx.logger.*` call sites across all 9 packages migrated to the `LogBody`/`LogFault` builder API; verified 0 typecheck errors and 0 test failures |
| `@studnicky/errors` | planned | `core`, `cli` | Standardized error hierarchy instead of ad hoc throws; migration plan: `docs/internal/errors-migration-plan.md` |
| `@studnicky/types` | planned | `core` | Zero-runtime utility types; satisfies `@studnicky/no-prefer-existing-type` instead of reinventing shared type helpers |
| `@studnicky/config` | planned | `cli` | Validate user-supplied theme config shape before it reaches `core` |

## Node-only tooling (`cli`, `image`, `vscode`)

| Package | Status | Where | Notes |
|---|---|---|---|
| `@studnicky/batch` | planned | `cli` | Controlled-concurrency multi-file output writes (stylesheet/tailwind/rdf emitted together) |
| `@studnicky/file-lock` | planned | `cli` | Atomic rename-based lock for concurrent output writers |
| `@studnicky/system` | planned | `image` | Worker-pool sizing for parallel image processing |
| `@studnicky/retry` | planned | `cli`, `vscode` | Network/FS retry classification |
| `@studnicky/throttle` | planned | `cli`, `image` | Sliding-window concurrency control for batch image/file operations |
| `@studnicky/fetch` | planned | `cli`, `vscode` | HTTP client if/when remote palette or font sources are fetched |
| `@studnicky/context` | n/a | — | AsyncLocalStorage per-request isolation; no server/request-scoped execution model in this workspace |
| `@studnicky/mutex` | n/a | — | No shared-resource race conditions identified yet |
| `@studnicky/concurrency` | n/a | — | Semaphore/Coalesce/Channel/AsyncIter; no async-coordination need identified yet |
| `@studnicky/resilience` | n/a | — | CircuitBreaker/TokenBucket/DeadLetterQueue; no external-service call surface in this workspace |
| `@studnicky/scheduler` | n/a | — | Real-time/virtual scheduling; no recurring-job surface identified yet |

## Browser-safe (verified zero `node:` imports) — GitHub Pages demo (`site/`)

| Package | Status | Where | Notes |
|---|---|---|---|
| `@studnicky/signal` | planned | `site/app` | AbortSignal composition — cancel a stale in-flight color computation when theme inputs change mid-render |
| `@studnicky/event-bus` | planned | `site/app` | Decouple theme-switch events from syntax-highlight/coverflow/3D-deck re-renders |
| `@studnicky/fsm` | planned | `site/app` | Model demo interaction states (idle/computing/rendering) instead of ad hoc refs |
| `@studnicky/virtual-fs` | planned | `site/app` | Client-side "preview generated output files" panel without touching a real filesystem |
| `@studnicky/clock` | planned | `site/app` | Deterministic timing source for the perf readout below |
| `@studnicky/timing` | planned | `site/app` | "Computed in Xms" stat surfaced on the demo page |
| `@studnicky/cache` | planned | `site/app` | Client-side memoization of derived palettes as the user scrubs inputs |
| `@studnicky/circular-buffer` | planned | `site/app` | Rolling history buffer if a "recent palettes" strip is added |
| `@studnicky/sample-buffer` | planned | `site/app` | Percentile stats for the perf readout if frame/compute timing is sampled over time |

## Not yet reviewed for a UI-side fit

| Package | Status | Notes |
|---|---|---|
| `@studnicky/config` | see Core engine row above (dual `cli`/potential `site` fit if theme presets need validation) |

---

**Adoption rule**: each row moves from `planned` to `adopted` only when the
package is actually imported in the named location and its own package's
lint/typecheck passes under the full `eslint.config.mjs` rule set above. Do
not mark `adopted` on the strength of installation alone — installation only
makes the package available, not in use.
