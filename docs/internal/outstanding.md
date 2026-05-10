# Outstanding work — phase board

State of in-flight work after the May 2026 docs-iteration sprint. Read `HANDOFF.md` for orientation, `architecture.md` for layout. Update this file as items complete; treat it as the authoritative work board.

**Scope reframe:** v0.1 ships `@studnicky/iridis` (the engine) only. Output adapters publish independently on their own cadence. The docs site dogfoods the engine — every chrome and syntax token is iridis-emitted, the user picks seeds, the page recomputes.

## Verified shipped (live in main)

### Core engine — `@studnicky/iridis@0.1.0` (pre-publish, ship-ready)

- Composition spine: `Engine`, `TaskRegistry`, `ColorMathRegistry`
- 25 math primitives (OKLCH ↔ RGB ↔ HSL ↔ Hex, sRGB ↔ linear ↔ Display P3, mix/lighten/darken/saturate/desaturate/hueShift, WCAG 2.1, APCA, ΔE2000, `ensureContrast`, median-cut clustering, luminance, contrastText)
- 15 canonical pipeline tasks: `intake:hex/rgb/hsl/oklch/lab/named/imagePixels/any`, `clamp:count/oklch`, `resolve:roles`, `expand:family`, `enforce:contrast`, `derive:variant`, `emit:json`
- `quickPalette(seeds, framing?)` one-liner convenience export
- Required-role enforcement: `resolve:roles` guarantees populated AND constraint-satisfying assignment via `nudgeIntoRole` and `synthesizeForRole`
- `RuntimeOptionsInterface` typed surface (`framing`, `colorSpace`, `extra`); `input.runtime` → `state.runtime`
- `getOrCreateOutput<T>(state, key)` helper hoisted to core for emit:* tasks
- 101 tests passing (`npx tsx --test`)
- Public API: `@studnicky/iridis` re-exports model, registry, engine, math, tasks, quickPalette, getOrCreateOutput

### Docs site — https://studnicky.github.io/iridis/

- VitePress aligned with reference design family (ripper, squashage, json-tology)
- Logo (transparent, alpha-corrected via imagemagick) in sidebar via `sidebar-nav-before` slot
- Sidebar: Introduction (What it does / Getting started / Try it out) → Concepts (Pipeline / Role schemas / ColorRecord / Contrast / Accessibility calculations) → Recipes (CLI / Vue + Capacitor) → Reference (Living color thesis)
- `Try it out` page: configuration form + one demo running the full pipeline with split-column layout (seeds left, OKLCH picker right) + tabs (Resolved roles / Role schema / Code)
- IridisDemo on home, getting-started, concepts/{pipeline,role-schemas,contrast}, recipes/cli pages
- IridisPicker: OKLCH-aware (L×C square + hue strip + hex/native input + L/C/H readout)
- Inline editable Role schema textarea + colors[] in Code tab; hand-rolled validators (browser-safe; json-tology pulled `node:url` and was dropped)
- Cascading docs theme: 8 chrome tokens + 14 syntax tokens emitted as `--iridis-*` properties; `--vp-c-*` + custom Shiki theme cascade from them via `var()`
- Vitepress dark/light navbar toggle ↔ `configStore.framing` bidirectional bind
- localStorage persistence (`iridis-docs-config`)
- GitHub Actions: docs deploy via push to main; protected branches; PR workflow

## Plugin v0.1 — separate publish cadence

Each output plugin has its own v0.1. None block the core engine ship.

### Per-plugin e2e suites — still queued

Each plugin needs `packages/<plugin>/tests/e2e/<Plugin>.e2e.test.ts`. Use `packages/core/tests/e2e/Engine.e2e.test.ts` as template; reuse `ScenarioRunner`. Run with `npx tsx --test`.

| Package | File path | Coverage targets |
|---|---|---|
| stylesheet | `packages/stylesheet/tests/e2e/Stylesheet.e2e.test.ts` | `emit:cssVars` rootBlock/scopedBlock/darkScheme/forcedColors/wideGamut/full/map populated |
| tailwind | `packages/tailwind/tests/e2e/Tailwind.e2e.test.ts` | `emit:tailwindTheme` produces colors/cssVars/config; shade-grouping into nested object |
| vscode | `packages/vscode/tests/e2e/Vscode.e2e.test.ts` | full pipeline with `vscodeRoleSchema16` → `state.outputs.vscode.themeJson` populated; expandTokens=23 base; applyModifiers count = 253 |
| contrast | `packages/contrast/tests/e2e/Contrast.e2e.test.ts` | `enforce:wcagAA` lifts a 2:1 pair to ≥4.5; AAA thresholds; APCA Lc; CVD warnings |
| capacitor | `packages/capacitor/tests/e2e/Capacitor.e2e.test.ts` | `emit:capacitorStatusBar` style picker; theme map; SplashScreen; androidThemeXml is valid XML |
| image | `packages/image/tests/e2e/Image.e2e.test.ts` | `gallery:extract` reduces N pixels to K; assignRoles; harmonize hue shift |
| rdf | `packages/rdf/tests/e2e/Rdf.e2e.test.ts` | `reason:annotate` populates n3 Store; serialize Turtle/TriG/N-Quads/JSON-LD |

CLI also needs `packages/cli/tests/e2e/Cli.e2e.test.ts` covering `Cli.run()`, `ConfigLoader.load()`, `PluginResolver.resolve()`. Plus a tiny fixture `packages/cli/tests/fixtures/minimal.config.json`.

### Plugin defects to address before adopting in docs

- Capacitor emit tasks duplicate `existingCapacitor` boilerplate (4 sites). Migrate to `getOrCreateOutput`.
- RDF emit tasks duplicate the same boilerplate. Migrate to `getOrCreateOutput`.

### CLI smoke

`cd /Users/studs/Workspace/iridis && npx tsx packages/cli/src/cli.ts examples/vue-capacitor/category-w3c.config.json`

Expected: produces `examples/vue-capacitor/out/music.css` and `music.capacitor.json`. Has not been re-run since the inline-validators / cascade work landed.

### MultiOutputDemo re-enable

Multi-output demo (`<MultiOutputDemo>`) is built and registered globally but not embedded in markdown. Re-embed once per-plugin tests and the existing pre-existing capacitor / image plugin code paths are audited.

## Docs — pre-publish polish

| File | Topic | Approx word count |
|---|---|---|
| `docs/recipes/vscode-theme.md` | Build a VS Code theme via the vscode plugin: 16 seed colors → `vscodeRoleSchema16` → `state.outputs.vscode.themeJson` → write to extension `themes/` folder | 400 |
| `docs/reference/plugins.md` | Table of all first-party output plugins with package name, role, exported tasks, math primitives | 400 |
| `docs/reference/tasks.md` | Full task name registry. For each: reads/writes/prerequisites | 600 |
| `docs/reference/math.md` | Built-in math primitive table with signatures + brief description; how to override | 400 |

## v0.2 — deferred

Tracked in `docs/v2-living-color.md`. Listed for queue completeness:

- `@studnicky/iridis-anima` — animation/interpolation engine
- `@studnicky/iridis-pulse` — reactive signal bindings
- `@studnicky/iridis-fsm` — palette state machine (XState-style)
- `@studnicky/iridis-trajectory` — curated palette paths
- `@studnicky/iridis-algebra` — palette math
- Migrate role schemas + `ColorRecord` + `PaletteState` through `@studnicky/json-tology` once json-tology ships a browser-safe entry point
- Self-referential brand demo: replace static `.iridis-brand` CSS gradient with runtime-driven sweep produced by `iridis-anima`
- Competitor decomp survey

## Open questions parked for the user

| Question | Context |
|---|---|
| Publish `@studnicky/iridis@0.1.0` to npm now? | Engine is feature-complete + 101 tests pass. Living docs site is up. |
| `examples/vue-capacitor/` future home | Keep in repo as unpublished demo, or extract to a separate sandbox repo? |
| Publish unscoped `iridis` placeholder? | Brand is `@studnicky/iridis` (scoped). Bare `iridis` is also available on the registry. |

## Process notes

1. `npm install && npx tsc --build && find packages/core/tests -name "*.test.ts" | xargs npx tsx --test` — confirm 101/101 pass.
2. Pick from "Per-plugin e2e suites" or "Docs — pre-publish polish".
3. **Run the actual tools** before declaring done.
4. Update this file as items complete.
