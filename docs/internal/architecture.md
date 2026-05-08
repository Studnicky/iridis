# Architecture — internal reference

Detailed layout, conventions, and the architectural decisions made during the v0.1 build. For the cold-start orientation, read `HANDOFF.md` at workspace root first.

## Workspace layout

```
iridis/
├─ HANDOFF.md
├─ README.md          ← public-facing GitHub README
├─ CHANGELOG.md
├─ LICENSE
├─ package.json       ← workspace root: private, "workspaces": ["packages/*"]
├─ tsconfig.base.json ← shared compiler options, extended by every package
├─ tsconfig.json      ← workspace-wide noEmit typecheck via project references
├─ packages/
│  ├─ core/           ← @studnicky/iridis            zero runtime deps
│  ├─ cli/            ← @studnicky/iridis-cli        bin: iridis
│  ├─ vscode/         ← @studnicky/iridis-vscode     theme generator
│  ├─ stylesheet/     ← @studnicky/iridis-stylesheet CSS variables emitter
│  ├─ tailwind/       ← @studnicky/iridis-tailwind   v3 config + v4 cssVars
│  ├─ image/          ← @studnicky/iridis-image      pixel intake → palette
│  ├─ contrast/       ← @studnicky/iridis-contrast   WCAG / APCA / CVD
│  ├─ capacitor/      ← @studnicky/iridis-capacitor  StatusBar / themes.xml
│  └─ rdf/            ← @studnicky/iridis-rdf        n3-backed RDF emitter
├─ docs/              ← VitePress site
│  ├─ public/logo.png
│  ├─ .vitepress/     ← config, theme, brand plugin
│  ├─ index.md
│  ├─ getting-started.md
│  ├─ v2-living-color.md
│  ├─ concepts/       ← pipeline, role-schemas, color-record, contrast
│  ├─ recipes/        ← cli, vue-capacitor, vscode-theme (missing)
│  ├─ reference/      ← plugins, tasks, math (all missing)
│  └─ internal/       ← this file + outstanding.md
├─ examples/
│  └─ vue-capacitor/  ← unpublished. Music-category seed-color demo
│     ├─ categoryColorService.ts
│     ├─ categoryW3cRoleSchema.ts
│     ├─ categoryW3cRoleSchema.json
│     ├─ MusicCategoryView.vue
│     ├─ category-w3c.config.json    ← CLI fixture
│     └─ README.md
├─ scripts/           ← (currently empty; prior fix-dts script was deleted)
└─ .github/
   └─ workflows/docs.yml ← GH Pages deploy
```

## Build model — ship-source

Mirrors `/Users/studs/Workspace/dollarwise-arch/DollarWise-Prototype/`.

- Workspace `tsconfig.base.json` has `noEmit: true`, `allowImportingTsExtensions: true`, `composite: true`.
- Every package's `tsconfig.json` is two lines past `extends`: just `include`. No `compilerOptions` overrides per package.
- Every package's `package.json` `exports` map points at `./src/*.ts`. No `main`, no `types`, no `dist/`.
- Workspace consumers' bundlers (Vite for the docs site, Vite for any web app, `tsx` for Node tests/CLI) transpile in context.
- Root `tsc --build` typechecks the whole graph via project references. Zero artifacts emitted.

This is the reason iridis can ship `.ts` extensions in every relative import without any postbuild rewrite step.

## Engine spine — composition

```
ColorRecord                          ← canonical OKLCH-first color shape
PaletteState                         ← run state: input, colors, roles, variants, outputs, metadata, optional graph
PluginInterface                      ← class with .name, .version, .tasks(), .math()
TaskInterface                        ← class with .name, .manifest?, .run(state, ctx)
MathPrimitiveInterface               ← class with .name, .apply(...args)

Engine.tasks: TaskRegistry           ← register, hook, resolve, list
Engine.math:  ColorMathRegistry      ← register, resolve, invoke
Engine.adopt(plugin): void           ← walks plugin.tasks() and .math(), registers each
Engine.pipeline(order): void         ← declares the run order
Engine.run(input): Promise<state>    ← runs onRunStart hooks, sequential tasks, onRunEnd hooks
```

Every output target (CSS, Tailwind, VS Code, Capacitor, RDF) is a plugin. Plugins are not part of core. Core has zero runtime dependencies.

## Pipeline — canonical task names

| Phase | Task name | Source |
|---|---|---|
| Intake | `intake:any`, `intake:hex`, `intake:rgb`, `intake:hsl`, `intake:oklch`, `intake:lab`, `intake:named`, `intake:imagePixels` | `core/src/tasks/intake/` |
| Clamp | `clamp:count`, `clamp:oklch` | `core/src/tasks/clamp/` |
| Resolve | `resolve:roles` | `core/src/tasks/resolve/` |
| Enforce (core) | `enforce:contrast` | `core/src/tasks/enforce/` |
| Enforce (contrast plugin) | `enforce:wcagAA`, `enforce:wcagAAA`, `enforce:apca`, `enforce:cvdSimulate` | `contrast/src/tasks/` |
| Expand | `expand:family` | `core/src/tasks/expand/` |
| Derive | `derive:variant` | `core/src/tasks/derive/` |
| Emit (core) | `emit:json` | `core/src/tasks/emit/` |
| Emit (vscode) | `vscode:expandTokens`, `vscode:applyModifiers`, `emit:vscodeSemanticRules`, `emit:vscodeUiPalette`, `emit:vscodeThemeJson` | `vscode/src/tasks/` |
| Emit (stylesheet) | `emit:cssVars`, `emit:cssVarsScoped` | `stylesheet/src/tasks/` |
| Emit (tailwind) | `emit:tailwindTheme` | `tailwind/src/tasks/` |
| Emit (capacitor) | `emit:capacitorStatusBar`, `emit:capacitorTheme`, `emit:capacitorSplashScreen`, `emit:androidThemeXml` | `capacitor/src/tasks/` |
| Image | `gallery:extract`, `gallery:assignRoles`, `gallery:harmonize` | `image/src/tasks/` |
| RDF | `reason:annotate`, `reason:serialize` | `rdf/src/tasks/` |

## Math primitive registry — canonical names

`oklchToRgb`, `rgbToOklch`, `hslToRgb`, `rgbToHsl`, `hexToRgb`, `rgbToHex`, `srgbToLinear`, `linearToSrgb`, `srgbToDisplayP3`, `displayP3ToSrgb`, `mixOklch`, `mixHsl`, `mixSrgb`, `lighten`, `darken`, `saturate`, `desaturate`, `hueShift`, `contrastWcag21`, `contrastApca`, `deltaE2000`, `ensureContrast`, `clusterMedianCut`, `luminance`, `contrastText`.

Plus the domain helper `colorRecordFactory` (not a primitive itself; provides `.fromHex`, `.fromOklch`, `.fromRgb`).

## Architectural decisions

### Brand: `iridis`

Latin/Greek for *rainbow*. Six characters, NPM-clean, fits the workspace's Mechanicus/mystical aesthetic alongside `auspex`, `fabricator`, `archivum`, `magos`. The unscoped `iridis` and the entire `iridis-*` family on npm were available as of the last check.

### Body words name the function

Plugin names telegraph what they do, not poetry. Reverted from the first draft (`aegis` → `contrast`, `codex` → `rdf`, `imago` → `image`). Platform names stay literal (`vscode`, `capacitor`, `tailwind`).

### Ship-source over per-package emit

Decided after wasting hours on `composite: true` + `rewriteRelativeImportExtensions: true` + `.ts` extension rewriting in `.d.ts` files. The dollarwise reference solved this with `noEmit: true` everywhere and `exports` pointing at source. Consumers' bundlers transpile in context. Adopted unchanged.

### Plugins as class-based domain modules

No free `registerXyzPlugin()` functions. A plugin is a class implementing `PluginInterface`, exported as a singleton (`vscodePlugin`, `contrastPlugin`, etc.). Consumer wires via `engine.adopt(plugin)`. The verb is on the engine; the plugin is a noun.

### CLI uses `enable*` flags + dynamic plugin imports

The CLI does not statically depend on plugins. The `PluginResolver` reads `enableVscode: true` etc. from the config and does `await import('@studnicky/iridis-vscode')` at runtime. Lets a consumer install the CLI without pulling every plugin's dependencies.

### `n3` is plugin-scoped, not core

Reasoning is optional. n3 lives in `packages/rdf/package.json` only. Core has zero dependencies. A consumer who only wants CSS variables doesn't pull n3 into their bundle.

### JSON for config; no YAML/TOML

Per the user's HARD rule. Sample CLI fixture is JSON. Role schemas are JSON Schema literals. Future on-disk role schemas would also be JSON.

### Schemas via `@studnicky/json-tology` (eventual)

`@studnicky/json-tology` is listed as an optional peer. The current iridis source authors JSON Schema literals `as const` directly without piping them through json-tology yet. Migrating the role schema, `ColorRecord`, and `PaletteState` schemas through json-tology is on the v0.2 roadmap. No Zod, no Ajv-in-source.

## VitePress brand strategy

The literal word "iridis" is wrapped by `docs/.vitepress/plugins/iridis-brand.mjs` with a `<span class="iridis-brand">` whose CSS gradient sweeps the visible spectrum. Static for v0.1; the v2 living-color thesis converts this into a runtime-driven gradient morphing through the iridis engine itself (a self-referential demo).

## Lessons captured (so we don't repeat)

- Look at existing reference projects in the workspace before standing up infrastructure (dollarwise for monorepo, json-tology for docs).
- Multi-phase work fans out across multiple agents; sequential debug stays single-agent.
- File moves use `mv`; copies leave duplicates.
- Agents must run their tools (typecheck, tests, the CLI) — writing files blind produces "looks plausible" failures.
- Litany hook is real; sibling-project tooling false positives are also real. Distinguish before bypassing.
- TypeScript composite mode + `.ts`-extension imports + emit is a mire. Ship-source dodges the whole class.
