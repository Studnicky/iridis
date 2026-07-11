# iridis, Handoff

Pick this up cold? Read this first, then `NOTES/architecture.md` for the layout and `NOTES/outstanding.md` for the work queue.

## What it is

iridis is a chromatic pipeline for dynamic palette derivation. Pluggable, OKLCH-native, contrast-enforced. Variable-input-count seed colors expand into role-resolved palettes; output adapters (CSS variables, Tailwind, VS Code themes, Capacitor native chrome, RDF graphs) are themselves plugins. The repo is at `https://github.com/Studnicky/iridis` (no commits pushed yet, git is initialised, remote is set, do not commit until the user says so).

## Current state, green

- Workspace monorepo at `/Users/studs/Workspace/iridis/`. npm workspaces (`packages/*`).
- 9 packages in `packages/`: `core`, `cli`, `vscode`, `stylesheet`, `tailwind`, `image`, `contrast`, `capacitor`, `rdf`. All have lean tsconfigs, package.json `exports` pointing at `./src/*.ts`, and source files in place.
- **`npx tsc --build` exits 0 across the workspace.** Last verified before this handoff.
- `site/` is the one app: a Nuxt 4 app that runs the engine live, doubles as the interactive demo, and hosts the docs content (Nuxt Content pages under `site/content/`, plus in-page detail sections on the demo cards under `site/app/components/content/`).
- GitHub Pages workflow at `.github/workflows/docs.yml` builds and deploys `site/` (`nuxt generate`).
- The old VitePress site (`docs/`) is retired and deleted. Its product/demo pages were superseded by `site/`'s own components; its genuine reference/concept documentation was ported into `site/content/*.md` and detail sections in `site/app/components/content/*.vue`; its internal engineering notes moved to `NOTES/`.
- Living-color v2 thesis is folded into the "Roadmap" section of `site/content/02-architecture.md`.

## Current state, outstanding

See `NOTES/outstanding.md` for the full queue. Top items:

- 7 plugin e2e test suites (every plugin needs an e2e test file under `packages/<plugin>/tests/e2e/`)
- CLI smoke test verification (`npx tsx packages/cli/src/main.ts examples/vue-capacitor/category-w3c.config.json`)
- Vue/Capacitor example service: verify imports still resolve cleanly after the type-hoist + dispatcher work
- Broader front-end audit of `site/` (perf, a11y, broken interactables, extractable shared components) — planned, not yet started

Verified shipped since the last handoff:

- Type declarations hoisted to `packages/core/src/types/<domain>.ts`
- Built-in docs schemas renamed to `iridis-4/8/12/16` (4 ⊂ 8 ⊂ 12 ⊂ 16, each a `{ dark, light }` pair)
- VitePress (`docs/`) retired; `site/` (Nuxt) consolidated as the single app. Its own FSM (`site/app/composables/fsm/IridisUiMachine.ts` + `useIridisUiMachine.ts`) is the sole UI state machine driving the engine pipeline — the old `docs/.vitepress/theme/stores/themeDispatcher.ts` no longer exists.
- 7 color-math reference sections ported into `site/app/components/content/ColorSpaces.vue` as a live "Learn more" detail section (hex/rgb/hsv/cmyk/oklch/wcag/apca), with worked examples computed from the currently selected role.
- Em-dashes, smart quotes, ellipsis chars, NBSPs purged from the markdown corpus
- TSDoc on every public export across packages
- 6 per-package READMEs (every package now has one)
- Markdown corpus cohesion sweep: terminology consistency, cross-reference integrity

## Architecture in two sentences

Core defines `Engine`, `TaskRegistry`, `ColorMathRegistry`, `ColorRecord`, `PaletteState`. Plugins are class-based domain modules implementing `PluginInterface`; each registers tasks and math primitives via `engine.adopt(plugin)`.

Pipeline shape: `intake:* → clamp:* → resolve:roles → enforce:* → expand:family → derive:variant → emit:*`. Consumers compose by registering plugins and calling `engine.pipeline([...names])` then `engine.run(input)`.

## Critical references

| Path | Why |
|---|---|
| `/Users/studs/Workspace/dollarwise-arch/DollarWise-Prototype/` | Reference for the **ship-source pattern**: `noEmit: true`, exports point at `./src/*.ts`, no per-package dist. iridis mirrors this. |
| `/Users/studs/Workspace/vscode-arcade-blaster/dev/themes/tools/` | Source of the VS Code theme generation logic that `packages/vscode/` lifted. |

## Code standards (binding)

- Domain modules with `noun.verb()` only. No free functions outside classes. No `with*`/`create*`/`register*Plugin()` helpers.
- Single class per file. PascalCase class, camelCase singleton instance exported alongside.
- Quoted property keys throughout TS source.
- TypeScript strict + `exactOptionalPropertyTypes` everywhere.
- `.ts` extensions on relative imports (workspace is `noEmit: true` + `allowImportingTsExtensions: true`).
- ESM only.
- `@studnicky/json-tology` for JSON Schema authoring (optional peer; not yet used in iridis source, eligible target for the role schemas).
- No Zod, no Ajv, no Yup. Schemas are JSON Schema literals `as const`.

## Hook posture

The litany hook on Edit/Write was previously broken upstream by a sibling project (`code-quality/noocodec` had a commander.js double-`validate` registration). It has been fixed. Going forward:

- Real lint/standards violations: fix the code, do not bypass.
- Sibling-project tooling false positives: STOP and report, do not bypass via Bash heredoc.

## Recent reality check (lessons)

- **Don't trial-and-error TypeScript setup.** Look at a working reference first. The dollarwise project had ship-source figured out, finding it earlier would have saved hours.
- **Composite + emit + `.ts` extensions in source = pain.** TS 5.7's `rewriteRelativeImportExtensions` rewrites `.js` output but leaks `.ts` into `.d.ts` declaration emit in some configs. Ship-source (`noEmit: true`) sidesteps the whole class.
- **Don't dump multi-phase work onto one agent.** Phase 1 of the workspace conversion (writing 5 missing package.json + 9 tsconfig + CLI source + sample fixture) was 4 independent lanes. Sending it to one agent serialised the work.
- **Use `mv` for moves, not `cp`.** `cp` leaves duplicates and timestamps drift.
- **Run the tools.** Agents writing files blind without running `tsc`/`tsx --test`/the actual artifact produces "looks plausible" code that breaks at the seam.

## How to continue

1. `cd /Users/studs/Workspace/iridis && npm install`
2. `npx tsc --build`, should exit 0
3. Pick a queue item from `NOTES/outstanding.md`
4. For substantial work, dispatch a sonnet/haiku agent with explicit acceptance criteria; for mechanical work, do it inline
5. Verify with the actual command (`tsx --test`, the CLI binary, `cd site && npm run build`, etc.) before declaring done

## Naming registry (locked)

| Package | Folder |
|---|---|
| `@studnicky/iridis` | `packages/core` |
| `@studnicky/iridis-cli` | `packages/cli` |
| `@studnicky/iridis-vscode` | `packages/vscode` |
| `@studnicky/iridis-stylesheet` | `packages/stylesheet` |
| `@studnicky/iridis-tailwind` | `packages/tailwind` |
| `@studnicky/iridis-image` | `packages/image` |
| `@studnicky/iridis-contrast` | `packages/contrast` |
| `@studnicky/iridis-capacitor` | `packages/capacitor` |
| `@studnicky/iridis-rdf` | `packages/rdf` |

Reserved for v2 (post-v1): `iridis-anima`, `iridis-pulse`, `iridis-fsm`, `iridis-trajectory`, `iridis-algebra`. All confirmed available on npm registry as of last check.

## Documentation map

| File | Audience |
|---|---|
| `README.md` | GitHub repo visitors, pitch + install + sample |
| `CHANGELOG.md` | Versioned changes |
| `LICENSE` | MIT |
| `site/` | The one app — live engine demo + docs, deployed to GitHub Pages |
| `site/content/01-getting-started.md` | First-use walkthrough |
| `site/content/02-architecture.md` | Architecture + v2 roadmap |
| `site/content/03-plugins-and-cli.md` | Plugin/CLI reference |
| `site/content/04-integration.md` | Integration recipes (Vue + Capacitor, etc.) |
| `site/app/components/content/*.vue` | Live demo cards, each with an in-page "Learn more" detail section (pipeline, contrast, color spaces, role schemas, output formats) |
| `HANDOFF.md` | This file |
| `NOTES/architecture.md` | Detailed layout + decisions (internal engineering notes) |
| `NOTES/outstanding.md` | Work queue (internal engineering notes) |
