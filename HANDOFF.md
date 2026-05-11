# iridis, Handoff

Pick this up cold? Read this first, then `docs/internal/architecture.md` for the layout and `docs/internal/outstanding.md` for the work queue.

## What it is

iridis is a chromatic pipeline for dynamic palette derivation. Pluggable, OKLCH-native, contrast-enforced. Variable-input-count seed colors expand into role-resolved palettes; output adapters (CSS variables, Tailwind, VS Code themes, Capacitor native chrome, RDF graphs) are themselves plugins. The repo is at `https://github.com/Studnicky/iridis` (no commits pushed yet, git is initialised, remote is set, do not commit until the user says so).

## Current state, green

- Workspace monorepo at `/Users/studs/Workspace/iridis/`. npm workspaces (`packages/*`).
- 9 packages in `packages/`: `core`, `cli`, `vscode`, `stylesheet`, `tailwind`, `image`, `contrast`, `capacitor`, `rdf`. All have lean tsconfigs, package.json `exports` pointing at `./src/*.ts`, and source files in place.
- **`npx tsc --build` exits 0 across the workspace.** Last verified before this handoff.
- VitePress docs scaffolded under `docs/` with iridescent brand palette + iridis-brand markdown plugin.
- GitHub Pages workflow at `.github/workflows/docs.yml`.
- Logo at `docs/public/logo.png`. Wired into vitepress theme + index hero.
- Living-color v2 thesis at `docs/v2-living-color.md`.

## Current state, outstanding

See `docs/internal/outstanding.md` for the full queue. Top items:

- 7 plugin e2e test suites (every plugin needs an e2e test file under `packages/<plugin>/tests/e2e/`)
- 4 doc pages still queued: `docs/recipes/vscode-theme.md`, `docs/reference/{plugins,tasks,math}.md`
- CLI smoke test verification (`npx tsx packages/cli/src/main.ts examples/vue-capacitor/category-w3c.config.json`)
- Vue/Capacitor example service: verify imports still resolve cleanly after the type-hoist + dispatcher work

Verified shipped since the last handoff:

- Type declarations hoisted to `packages/core/src/types/<domain>.ts`
- Built-in docs schemas renamed to `iridis-4/8/12/16` (4 ⊂ 8 ⊂ 12 ⊂ 16, each a `{ dark, light }` pair)
- State-machine dispatcher (`docs/.vitepress/theme/stores/themeDispatcher.ts`) replaces the old configStore + bindings
- 7 color-math reference pages added (`docs/reference/{hex,rgb,hsv,cmyk,oklch,wcag,apca}.md`)
- v2 thesis moved from "Reference" to "Introduction" sidebar group; new Reference group has `Color spaces` + `Accessibility standards` subsections
- Em-dashes, smart quotes, ellipsis chars, NBSPs purged from the markdown corpus
- TSDoc on every public export across packages and the docs theme
- 6 per-package READMEs (every package now has one)
- Markdown corpus cohesion sweep (this pass): terminology consistency, cross-reference integrity

## Architecture in two sentences

Core defines `Engine`, `TaskRegistry`, `ColorMathRegistry`, `ColorRecord`, `PaletteState`. Plugins are class-based domain modules implementing `PluginInterface`; each registers tasks and math primitives via `engine.adopt(plugin)`.

Pipeline shape: `intake:* → clamp:* → resolve:roles → enforce:* → expand:family → derive:variant → emit:*`. Consumers compose by registering plugins and calling `engine.pipeline([...names])` then `engine.run(input)`.

## Critical references

| Path | Why |
|---|---|
| `/Users/studs/Workspace/dollarwise-arch/DollarWise-Prototype/` | Reference for the **ship-source pattern**: `noEmit: true`, exports point at `./src/*.ts`, no per-package dist. iridis mirrors this. |
| `/Users/studs/Workspace/json-tology/docs/.vitepress/` | Reference for the vitepress + brand-gradient plugin pattern. |
| `/Users/studs/Workspace/yamete/docs/` | Second vitepress reference. |
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
3. Pick a queue item from `docs/internal/outstanding.md`
4. For substantial work, dispatch a sonnet/haiku agent with explicit acceptance criteria; for mechanical work, do it inline
5. Verify with the actual command (`tsx --test`, the CLI binary, `vitepress build`, etc.) before declaring done

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
| `docs/index.md` | VitePress home page |
| `docs/getting-started.md` | First-use walkthrough |
| `docs/concepts/*.md` | Pipeline, role schemas, ColorRecord, contrast |
| `docs/recipes/*.md` | CLI usage, Vue+Capacitor, VS Code theme (last one missing) |
| `docs/reference/*.md` | Plugins / tasks / math (all missing) |
| `docs/v2-living-color.md` | The v2 thesis |
| `HANDOFF.md` | This file |
| `docs/internal/architecture.md` | Detailed layout + decisions |
| `docs/internal/outstanding.md` | Work queue |
