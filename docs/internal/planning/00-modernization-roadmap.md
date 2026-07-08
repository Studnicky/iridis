# iridis modernization roadmap

Status: proposed, awaiting sign-off. Consolidated plan for bringing iridis
current with the `@studnicky` ecosystem (substrate, Dagonizer, json-tology),
publishing via GitHub Packages, and making the tool more stable, better-looking,
more performant, and easier to configure.

Prepared July 2026 from a five-stream survey of `develop @ c60b800` (v0.4.5) and
the sibling projects. Companion docs:

- [`01-doc-rebaseline.md`](./01-doc-rebaseline.md) — internal-docs drift delta.
- [`02-engine-spine-decision.md`](./02-engine-spine-decision.md) — engine runtime choice.
- [`03-ui-stabilization-audit.md`](./03-ui-stabilization-audit.md) — docs-site / Pages fixes (current VitePress site).
- [`04-docs-site-migration.md`](./04-docs-site-migration.md) — VitePress → Nuxt + Nuxt UI + Nuxt Content (decided direction).

## Where iridis actually is (baseline)

- **v0.4.5**, 9 packages, ship-source (`exports` → `./src/*.ts`), `tsc --build`
  exit 0, **687/687 tests passing**. The engine is healthy.
- **The internal docs describe a different project.** HANDOFF / architecture /
  outstanding are frozen at "v0.1 pre-publish" and contradict shipped reality
  (e.g. they claim "zero runtime deps / no ajv" — v0.4.0 added ajv +
  json-schema-to-ts). One public doc is wrong too (`getting-started.md:10`).
- **The busted Pages UI is a defect on `develop`, not unlanded work** — every UI
  redesign branch is already merged. Root cause: the sidebar drawer force-opens
  over content on every load (see UI audit).
- **No publish infrastructure exists** — no `.npmrc`, no `publishConfig`, no
  publish workflow. `@studnicky/iridis` is 404 on every registry.
- **dagonizer / substrate / json-tology are sibling projects, not deps.** Only
  json-tology is referenced (and it was tried and dropped). substrate is unused.

## The five asks → disposition

| Ask | Finding | Direction |
|---|---|---|
| Update concepts; stop being out of date with dagonizer/json-tology | Docs drift is the real "out of date." Dagonizer plan superseded; json-tology's `node:url` blocker is now resolved but ajv/json-schema-to-ts already chosen. | Re-baseline docs (Phase 1). Do **not** resurrect the Dagonizer migration. json-tology optional/later. |
| Pull packages directly from GitHub Packages | Zero publish infra today; siblings all publish to `npm.pkg.github.com`. Copyable recipe exists. | Add GitHub Packages publishing (Phase 3). |
| Better leverage `@studnicky/substrate` | substrate's `fsm`/`signal`/`scheduler`/`cache`/`batch` map cleanly onto iridis's gaps, all browser-safe. | Adopt à la carte (Phase 4, v2 groundwork). |
| Better-looking, more stable, more performant | Concrete UI defects found: drawer force-open, no debounce, 608 KB bundle, dead code. | Quick-win fixes now (Phase 2); full end-state is the Nuxt migration (Phase 5). |
| Easier to configure | Config surface is already the strongest part; one silent-failure gap. | Minor fix folded into Phase 2. |

**Framework decision (July 2026):** the docs site migrates off VitePress to **Nuxt +
Nuxt UI (Reka UI + Tailwind v4) + Nuxt Content** — see
[`04-docs-site-migration.md`](./04-docs-site-migration.md). This is the Vue-native
equivalent of Leadography's React shadcn/Radix kit, and it resolves the vite/esbuild
security dead-end (VitePress pins an old Vite with no fix; Nuxt tracks current Vite) as
a side effect. The engine's `--iridis-*` CSS-variable output maps natively onto Tailwind
v4 tokens, making the dogfooding thesis native rather than a cascade hack.

## Phased plan

Ordering follows substrate-first / sprout-then-swap: fix the truth baseline, then
stabilize what users see, then wire publishing, then evolve the engine. Each phase
completes and verifies before the next.

### Phase 1 — Truth baseline (docs re-baseline)
Low risk, unblocks everything. Apply the ordered edits in
[`01-doc-rebaseline.md`](./01-doc-rebaseline.md).
- **P0:** fix `getting-started.md:10` (public falsehood).
- Rewrite HANDOFF, architecture, outstanding to v0.4.5 reality; document the
  v0.4.0 slot grammar (biggest undocumented fact).
- **Exit:** internal docs describe v0.4.5; no "zero runtime deps" / "v0.1" / stale
  test-count claims remain.

### Phase 2 — UI stabilization (stable + good-looking Pages)
Apply fixes 1–6 from [`03-ui-stabilization-audit.md`](./03-ui-stabilization-audit.md).
- Stop the drawer force-open below 1100px (+ persist user choice) — **the** fix.
- Debounce the config→engine projector (~150–250ms).
- Code-split the big five components out of global registration.
- Delete dangling esm.sh hints, stale import-map comment, stale mobile-nav comment,
  dead `ExportBar.vue`.
- Fold in the silent-schema-fallback fix (`applyConfigToDocument.ts:82-88`).
- **Exit:** a first-load Pages visit on mobile shows content, not a dimmed drawer;
  `app.js` for prose pages is materially smaller; `npm run docs:build` clean.
- Polish (fixes 7–8: decorative-layer gating, narrow-width fallbacks) can trail.

### Phase 3 — Publishing (GitHub Packages)
Net-new, low-effort. Recipe in [`02-engine-spine-decision.md`](./02-engine-spine-decision.md)
appendix / the sibling survey.
- Root `.npmrc`: `@studnicky:registry=https://npm.pkg.github.com`.
- `publishConfig` on all 9 packages.
- Tag-triggered `.github/workflows/publish.yml` (substrate's pattern; typecheck,
  not build, since ship-source). `secrets.GITHUB_TOKEN` suffices to publish.
- **First, fix the package-hygiene blockers** (see Cross-cutting below) — a stale
  lockfile will fail `npm ci` in the publish job.
- **Exit:** a tag push publishes all packages to GitHub Packages; a consumer repo
  with the `.npmrc` line + a `read:packages` PAT can `npm install @studnicky/iridis`.

### Phase 4 — Engine evolution (substrate à la carte, v2 groundwork)
Per [`02-engine-spine-decision.md`](./02-engine-spine-decision.md): keep the
sequential `Engine`; layer substrate primitives.
- Immediate: `@studnicky/signal` for cancel-in-flight recompute (pairs with the
  Phase 2 debounce).
- v0.5.0 v2 groundwork: `@studnicky/fsm` (palette state machine), `scheduler`
  (animation loop + `VirtualScheduler` for tests), `cache` (per-frame memo). This
  is the `iridis-anima` / `iridis-fsm` / `iridis-pulse` roadmap, built on
  substrate instead of hand-rolled.
- Deferred: `@studnicky/batch` for contrast fan-out once per-pair work is async.
- **Exit:** substrate primitives adopted where they add capability; engine public
  API and the 687 tests unchanged.

### Phase 5 — Docs-site migration (VitePress → Nuxt)
The docs-site rebuild. Full plan in
[`04-docs-site-migration.md`](./04-docs-site-migration.md). Sprout-and-swap: build the
Nuxt + Nuxt UI + Nuxt Content site in a new `site/` dir beside the live VitePress
`docs/`, port the theming spine → interactive demos → markdown corpus → remaining
components, then swap the Pages workflow and remove VitePress + PrimeVue.
- Runs in parallel with Phases 1/3/4 (independent of the engine/package work).
- **Exit:** Pages serves the Nuxt site; the engine drives Tailwind v4 tokens natively;
  `docs/` and the vite/esbuild advisories are gone.

Note: this removes the vite/esbuild security items from the cross-cutting blockers —
they are resolved by leaving VitePress's pinned Vite behind, not by a dependency
override. The `dompurify` override still applies to the current VitePress site while it
remains up during the build-out.

## Cross-cutting: package-hygiene blockers (do before Phase 3)

From the package audit — none block today via workspace symlinks, but they bite on
a clean CI checkout / publish:

1. **`package-lock.json` stale since v0.4.0** (records core@0.3.0/satellites@0.2.0
   vs actual 0.4.5/0.3.4). `docs.yml` runs `npm ci`, which requires lockfile sync
   → likely CI failure on a fresh runner. **Fix:** `npm install` to regenerate +
   commit; add a drift check.
2. **Satellite versions frozen at 0.3.4** while core is 0.4.5 (bump cadence broke
   at v0.4.5). Harmless now (`^0.4.0` resolves) but breaks the instant core hits
   0.5.0 — the exact 404 mode already seen in CHANGELOG [0.4.1]. **Fix:** automate
   satellite bumps + peerDep floors in the release script, or restore lockstep.
3. **`tsx` used by all 9 test scripts, declared in only core.** Breaks isolated
   testing. **Fix:** hoist to root devDependencies (or declare per package).
4. Minor: inconsistent `engines`/`typescript` devDep presence; `cli` uses a hard
   `dependency` where others use `peerDependency`; vestigial `rm -rf dist` scripts.

## Decisions needed from you

- Approve the engine-spine call (keep sequential + substrate à la carte; close
  `feature/dagonizer-engine`)?
- Green-light the branch cleanup (~59 merged/worktree branches deletable; 2 stale;
  the survey has the full list)?
- Publish target: GitHub Packages only, or also public npm eventually?
- Should I proceed to **execute** Phase 1 (+ the P0 public fix) now, on a feature
  branch, or hold at planning?
