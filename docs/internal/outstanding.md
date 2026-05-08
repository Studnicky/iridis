# Outstanding work — v0.1 queue

State of v0.1 closing work. Read `HANDOFF.md` for orientation, `architecture.md` for layout. Update this file as items complete; treat it as the authoritative work board.

**Scope reframe:** v0.1 ships the engine — `@studnicky/iridis` only. Output adapters (stylesheet, tailwind, vscode, contrast, capacitor, image, rdf) are independent plugins on their own publish cadence. Cross-output runtime toggles flow through the typed `state.runtime` slot on `PaletteState`; plugins read from it.

## Verified done

- Workspace conversion to ship-source (npm workspaces, `noEmit: true`, exports → `./src/*.ts`)
- All 9 packages: package.json, tsconfig.json, src/ populated
- `npx tsc --build` exits 0 across the workspace
- Core test suite: 88 tests, all pass via `npx tsx --test`
- Core public API: `src/index.ts` re-exports model + registry + engine + math + tasks; subpath exports for `./model`, `./registry`, `./engine`, `./math`, `./tasks`
- Engine runtime toggle surface: `RuntimeOptionsInterface` with `framing` (`dark` | `light`), `colorSpace` (`srgb` | `displayP3`), and `extra` bag; `input.runtime` → `state.runtime` flow with regression tests
- All 9 per-package READMEs (96–117 words each)
- Workspace root: README.md (reframed around core/plugin split), CHANGELOG.md, LICENSE, .gitignore
- packages/core/README.md (reframed; documents runtime toggles)
- Git initialised; `origin` → `https://github.com/Studnicky/iridis`. **No commits made**, awaiting user.
- Logo: `docs/public/logo.png`
- VitePress scaffold: `docs/.vitepress/{config.ts, theme.config.ts, theme/{palette.css,base.css,index.ts}, plugins/iridis-brand.mjs}`
- 6 doc pages: index, getting-started, v2-living-color, concepts/{pipeline, role-schemas, color-record, contrast}, recipes/{cli, vue-capacitor}
- GitHub Pages workflow: `.github/workflows/docs.yml`
- Sample CLI fixture: `examples/vue-capacitor/category-w3c.config.json`
- Vue+Capacitor example: `categoryColorService.ts`, `categoryW3cRoleSchema.ts`/`.json`, `MusicCategoryView.vue`, README

## Core MVP — verified shippable

The engine package is feature-complete for v0.1:

- Composition spine (`Engine`, `TaskRegistry`, `ColorMathRegistry`)
- Canonical pipeline tasks: `intake:* / clamp:* / resolve:roles / expand:family / enforce:contrast / derive:variant / emit:json`
- 25 math primitives covering color-space conversion, mixing, modulation, contrast (WCAG/APCA), ΔE2000, ensureContrast, median-cut clustering
- Typed runtime toggle surface for cross-output settings
- 88 passing tests (Engine, TaskRegistry, ColorMathRegistry, Pipeline composition, Math composition)
- Public API exports verified

Decision points resolved:
- **Tailwind v3 vs v4 default:** N/A at engine layer — separate plugins per Tailwind version.
- **Gallery dark/light:** runtime toggle on `state.runtime.framing`, plugins read it; no schema flip required.
- **VS Code modifier rule count:** plugin-internal, defer to vscode plugin ship.

## Plugin v0.1 work — separate publish cadence

Each output plugin has its own v0.1. None block the core engine ship. Per-plugin acceptance criteria below preserved from the prior queue for when plugin work resumes.

### Per-plugin e2e suites (one file per plugin)

Each plugin needs `packages/<plugin>/tests/e2e/<Plugin>.e2e.test.ts`. Use `packages/core/tests/e2e/Engine.e2e.test.ts` as the template; reuse `ScenarioRunner`. Run with `npx tsx --test`.

| Package | File path | Coverage targets |
|---|---|---|
| stylesheet | `packages/stylesheet/tests/e2e/Stylesheet.e2e.test.ts` | `emit:cssVars` rootBlock/scopedBlock/darkScheme/forcedColors/wideGamut/full/map populated; scoped by `state.metadata.scopeAttr`; camelCase → kebab-case CSS vars |
| tailwind | `packages/tailwind/tests/e2e/Tailwind.e2e.test.ts` | `emit:tailwindTheme` produces colors/cssVars/config; shade-grouping `accent-50` etc. into nested object |
| vscode | `packages/vscode/tests/e2e/Vscode.e2e.test.ts` | full pipeline with `vscodeRoleSchema16` → `state.outputs.vscode.themeJson` populated; expandTokens=23 base; applyModifiers count = 253 (10 mods × 23 + 23) |
| contrast | `packages/contrast/tests/e2e/Contrast.e2e.test.ts` | `enforce:wcagAA` lifts a 2:1 pair to ≥4.5; AAA thresholds; APCA Lc; CVD warnings |
| capacitor | `packages/capacitor/tests/e2e/Capacitor.e2e.test.ts` | `emit:capacitorStatusBar` style picker; theme map; SplashScreen; androidThemeXml is valid XML |
| image | `packages/image/tests/e2e/Image.e2e.test.ts` | `gallery:extract` reduces N pixels to K; assignRoles; harmonize hue shift |
| rdf | `packages/rdf/tests/e2e/Rdf.e2e.test.ts` | `reason:annotate` populates n3 Store; serialize Turtle/TriG/N-Quads/JSON-LD |

CLI (independent of plugin work) needs `packages/cli/tests/e2e/Cli.e2e.test.ts` covering `Cli.run()`, `ConfigLoader.load()`, `PluginResolver.resolve()`, plus a tiny fixture `packages/cli/tests/fixtures/minimal.config.json`.

### CLI smoke

`cd /Users/studs/Workspace/iridis && npx tsx packages/cli/src/cli.ts examples/vue-capacitor/category-w3c.config.json`

Expected: produces `examples/vue-capacitor/out/music.css` and `music.capacitor.json`. Has not been run end-to-end since the ship-source pivot. If `tsx` doesn't resolve workspace package imports cleanly via the dynamic `await import('@studnicky/iridis-stylesheet')` in `PluginResolver`, switch to `node --import tsx packages/cli/src/cli.ts ...`.

### Vue/Capacitor example import audit

`examples/vue-capacitor/categoryColorService.ts` imports plugins via `@studnicky/iridis-*` package names. Verify they all resolve (`tsc --noEmit` from workspace root will catch this).

### Plugin singleton-name audit

Confirm every plugin's `index.ts` exports the singleton with the canonical name (`stylesheetPlugin`, `vscodePlugin`, `contrastPlugin`, etc.) — the CLI's `PluginResolver` looks them up by these names.

### Tailwind versioning

Tailwind v3 and v4 are separate plugins, not flags on one plugin. Decide naming when each is published (`@studnicky/iridis-tailwind-v3`, `@studnicky/iridis-tailwind-v4` or similar).

## Docs — pre-publish polish

| File | Topic | Approx word count |
|---|---|---|
| `docs/recipes/vscode-theme.md` | Build a VS Code theme via the vscode plugin: 16 seed colors → `vscodeRoleSchema16` → `state.outputs.vscode.themeJson` → write to extension `themes/` folder | 400 |
| `docs/reference/plugins.md` | Table of all first-party output plugins with package name, role, exported tasks, math primitives | 400 |
| `docs/reference/tasks.md` | Full task name registry (intake/clamp/resolve/enforce/expand/derive/emit + plugin-specific). For each: reads/writes/prerequisites | 600 |
| `docs/reference/math.md` | Built-in math primitive table with signatures + brief description; how to override | 400 |
| `docs/concepts/runtime-options.md` (NEW) | Runtime toggle surface (`framing`, `colorSpace`, plugin extras); how plugins read from `state.runtime` | 300 |

Sidebar update: `docs/.vitepress/config.ts` sidebar should reference all the doc pages. Current sidebar is a stub.

## Pre-publish niceties

- Verify VitePress builds: `npm run docs:build` from workspace root
- Verify GH Pages workflow is valid: `.github/workflows/docs.yml` triggers on push to main
- Add `examples/vue-capacitor/categoryColorService.ts` to the e2e test loop somehow

## Deferred to v0.2 (post-publish)

These are tracked in `docs/v2-living-color.md`, listed here for queue completeness.

- `@studnicky/iridis-anima` — animation/interpolation engine for runtime palette morphing
- `@studnicky/iridis-pulse` — reactive signal bindings (time-of-day, audio, scroll, attention, ambient)
- `@studnicky/iridis-fsm` — palette state machine (XState-style)
- `@studnicky/iridis-trajectory` — curated palette paths (sunrise, lava-lamp, bioluminescence)
- `@studnicky/iridis-algebra` — palette math (lerp, delta, nearest, perpendicular)
- Migrate role schemas + `ColorRecord` + `PaletteState` through `@studnicky/json-tology`
- Competitor decomp survey (one `docs/decomp/<name>.md` per major competitor; full list in `v2-living-color.md`)
- Self-referential brand demo: replace the static `.iridis-brand` CSS gradient with a runtime-driven sweep produced by `iridis-anima`

## Open questions parked for the user

| Question | Context |
|---|---|
| `examples/vue-capacitor/` future home | Keep in repo as unpublished demo, or extract to a separate sandbox repo? |
| Publish unscoped `iridis` as squat-prevention placeholder? | Brand is `@studnicky/iridis` (scoped). Bare `iridis` is also available; user said they'd handle this. |

## Process notes for the next picker-upper

1. Read `HANDOFF.md` first.
2. `cd /Users/studs/Workspace/iridis && npm install && npx tsc --build` — confirm green starting point.
3. **Run tests:** `find packages/core/tests -name "*.test.ts" | xargs npx tsx --test` — confirm 88/88 pass.
4. Pick from "Plugin v0.1 work" or "Docs" queues. Each item has explicit acceptance criteria.
5. For substantial items, dispatch a sonnet/haiku with explicit acceptance criteria. For mechanical items (under ~10 file edits), do them inline.
6. **Run the actual tools** (`npx tsx --test`, `npx tsx packages/cli/src/cli.ts ...`, `npm run docs:build`) before declaring an item done.
7. Update this file as items complete.
