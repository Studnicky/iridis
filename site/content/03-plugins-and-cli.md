---
title: 3. Plugins & CLI
description: Extend iridis with framework-specific output formats or run it directly from your terminal.
---

A plugin is any object that satisfies `PluginInterface` by providing a collection of tasks. 

```ts
interface PluginInterface {
  readonly name:    string;
  readonly version: string;
  tasks(): readonly TaskInterface[];
}
```

When you call `engine.adopt(plugin)`, iridis registers all of the plugin's tasks into the engine's `TaskRegistry` in one call.

## Official Plugins

iridis ships with an ecosystem of plugins designed to format the resolved palette into consumer-ready code. Each is published as a separate `@studnicky/iridis-*` package:

- `@studnicky/iridis-stylesheet`: Emits generic CSS custom properties (`--c-primary: #...`).
- `@studnicky/iridis-tailwind`: Emits a Tailwind CSS `tailwind.config.js` or `theme()` compatible object.
- `@studnicky/iridis-shadcn`: Emits CSS variables specifically structured for `shadcn/ui` integration.
- `@studnicky/iridis-mui`: Emits a Material UI `createTheme()` compatible palette object.
- `@studnicky/iridis-chakra`: Emits Chakra UI color tokens for `extendTheme()`.
- `@studnicky/iridis-panda`: Emits Panda CSS token configuration.
- `@studnicky/iridis-vscode`: Derives a full VS Code theme JSON (`tokenColors`, `semanticTokenColors`, and workbench UI elements).
- `@studnicky/iridis-capacitor`: Emits native status bar colors, splash screen config, and Android `theme.xml` for Capacitor mobile apps.
- `@studnicky/iridis-rdf`: Emits the palette as an RDF/OWL semantic graph.

## The CLI Runner

You don't have to write Node.js scripts to use iridis. The `@studnicky/iridis-cli` package allows you to run the engine directly from your terminal using a JSON configuration file.

```bash
npm install -g @studnicky/iridis-cli

iridis ./palette.config.json
```

The CLI dynamically imports and runs the plugins defined in your configuration file. This makes it perfect for integrating into CI/CD pipelines, build scripts, or code generation workflows.

### Install

```bash
npm install --save-dev @studnicky/iridis-cli
```

The CLI package declares the core engine as a peer dependency; install the plugins you need alongside it. Once installed, the `iridis` binary is available as an npm script command:

```bash
npx iridis ./palette.config.json
```

### Config file shape

The config is a plain JSON file validated against `CliConfigSchema` (`packages/cli/src/CliConfigSchema.ts`). Three top-level fields are required: `input`, `pipeline`, and `output`.

```json
{
  "input": {
    "colors":   ["#8B5CF6"],
    "contrast": { "level": "AA", "algorithm": "wcag21" },
    "roles":    { /* RoleSchemaInterface inline */ },
    "metadata": { "cssVarPrefix": "--c-" }
  },
  "enableContrast":   true,
  "enableStylesheet": true,
  "enableCapacitor":  false,
  "enableVscode":     false,
  "enableTailwind":   false,
  "enableImage":      false,
  "enableRdf":        false,
  "pipeline": [
    "intake:any",
    "resolve:roles",
    "expand:family",
    "enforce:wcagAA",
    "derive:variant",
    "emit:cssVars"
  ],
  "output": {
    "directory": "./out",
    "files": {
      "stylesheet:cssVars": "palette.css"
    }
  }
}
```

The `enable*` flags control which plugin packages are dynamically imported. Only flags set to `true` trigger an import, and the corresponding package must already be installed, the CLI does not install dependencies on your behalf. The `pipeline` array maps directly to `engine.pipeline()` in the library API; task names must be registered by either the core task set or one of the adopted plugins.

### Wiring into a build pipeline

```json
{
  "scripts": {
    "palette": "iridis ./palette.config.json",
    "build": "npm run palette && vite build"
  }
}
```

```yaml
- name: Generate palette
  run: npx iridis ./palette.config.json

- name: Upload palette artifact
  uses: actions/upload-artifact@v4
  with:
    name: palette
    path: out/
```

The CLI exits with code `0` on success and non-zero on validation or pipeline errors. Standard output carries progress logs; standard error carries fatal messages, both are machine-readable in CI. See `examples/vue-capacitor/category-w3c.config.json` for a full worked config that enables the Contrast and Capacitor plugins together.

## VS Code Theme Recipe

`@studnicky/iridis-vscode` derives a complete VS Code `theme.json` — workbench `colors`, `semanticTokenColors`, and `tokenColors` — from a 16-role palette. It's a five-task pipeline extension, not a single emit task, because a VS Code theme has more surface area than a CSS variable block: workbench chrome, editor syntax highlighting, and the newer semantic-token layer all need independently-derived color sets that then get assembled together.

### Why a second engine pass

The plugin's tasks run *after* the core pipeline resolves roles and enforces contrast — `vscode:expandTokens` and `vscode:applyModifiers` are their own mini-pipeline stage that takes the resolved 16-role palette and expands it into VS Code's much larger color vocabulary (23 base tokens, then 253 semantic-token rules), re-checking contrast against the background role as it goes. This is the "second engine pass" referenced in `MultiOutput.vue`: the core pipeline produces a role palette sized for UI theming; the VS Code plugin then derives an editor-theme-sized palette from that role palette using its own derivation tables (`DERIVATION_PARAMS`, `MODIFIER_TRANSFORMS`, `SCOPE_MAPPINGS`) rather than reusing `derive:variant`.

### Pipeline stages

| Stage | Task | What it does |
|---|---|---|
| 1 | `vscode:expandTokens` | Derives 23 VS Code base token colors from the 16 resolved roles, using `DERIVATION_PARAMS`. Writes `metadata['vscode:baseTokens']`. |
| 2 | `vscode:applyModifiers` | Applies 10 color modifiers (from `MODIFIER_TRANSFORMS`) to the base tokens, producing 253 semantic-token rules, and re-enforces contrast against the `background` role for each. Writes `metadata['vscode:semanticTokenRules']`. |
| 3a | `emit:vscodeSemanticRules` | Shapes the semantic-token rule map for `editor.semanticTokenColorCustomizations.rules`, using `SCOPE_MAPPINGS` and `FONT_STYLES`. Writes `outputs['vscode:semanticTokenRules']`. |
| 3b | `emit:vscodeUiPalette` | Derives 100+ workbench UI colors (`editor.background`, `sideBar.foreground`, etc.) from the 16-role palette, selecting light/dark variants by the resolved `background` luminance. Writes `outputs['vscode:workbenchColors']`. |
| 4 | `emit:vscodeThemeJson` | Combines the semantic rules and workbench colors into one `theme.json` shape (`{ name, type, colors, semanticTokenColors, tokenColors }`). Requires both `emit:vscodeSemanticRules` and `emit:vscodeUiPalette` to have already run. Writes `outputs['vscode:themeJson']`. |

Stages 3a and 3b are independent of each other and can run in either order (both depend only on stage 2's output), but stage 4 fails fast if either hasn't run yet.

Wide-gamut roles (records with `displayP3` populated) serialize to the CSS Color 4 `color(display-p3 r g b)` form in every emitted theme slot; sRGB-only roles stay as `#rrggbb`. VS Code 1.85+ accepts either form in any color slot.

### Producing a theme file

```ts
import { Engine, coreTasks } from '@studnicky/iridis';
import { vscodePlugin, vscodeRoleSchema16 } from '@studnicky/iridis-vscode';
import { writeFileSync } from 'node:fs';

const engine = new Engine();
for (const task of coreTasks) engine.tasks.register(task);
engine.adopt(vscodePlugin);

engine.pipeline([
  'intake:hex',
  'resolve:roles',
  'expand:family',
  'enforce:contrast',
  'derive:variant',
  'vscode:expandTokens',
  'vscode:applyModifiers',
  'emit:vscodeSemanticRules',
  'emit:vscodeUiPalette',
  'emit:vscodeThemeJson',
]);

const state = await engine.run({
  colors: ['#8B5CF6', '#EC4899', '#0d1117', '#e6edf3' /* ...16 seeds, one per vscodeRoleSchema16 role */],
  roles: vscodeRoleSchema16,
  metadata: { themeName: 'Iridis Dark' },
});

const themeJson = state.outputs['vscode:themeJson']!;
writeFileSync('themes/iridis-dark-color-theme.json', JSON.stringify(themeJson, null, 2));
```

`vscodeRoleSchema16` is the canonical 16-role schema the plugin expects — pass 16 seed colors matching its roles, in order.

### Loading it as a VS Code extension theme

The written file is a standard VS Code color theme contribution. Reference it from an extension's `package.json`:

```json
{
  "name": "iridis-dark-theme",
  "contributes": {
    "themes": [
      {
        "label": "Iridis Dark",
        "uiTheme": "vs-dark",
        "path": "./themes/iridis-dark-color-theme.json"
      }
    ]
  }
}
```

For local testing without publishing an extension, symlink or copy the generated `theme.json` into an existing theme extension's `themes/` directory, or load the workspace folder in VS Code's Extension Development Host (`F5`) with the `package.json` above.

## Task Registry Reference

Every task registered by the core engine and by each official plugin, grouped by plugin. `name` is the pipeline identifier passed to `engine.pipeline([...])`; `requires` (where present) lists tasks that must already have run in the same pipeline.

### Core (`@studnicky/iridis`)

| Task | Requires | Description |
|---|---|---|
| `intake:any` | — | Recommended default intake task. Dispatches each entry to the first matching format delegate. |
| `intake:hex` | — | Parses `#RRGGBB`, `#RGB`, and 8-digit hex strings. |
| `intake:rgb` | — | Parses `{r,g,b,a?}` in 0..1 or 0..255 (auto-detected). |
| `intake:hsl` | — | Parses `{h,s,l,a?}`. |
| `intake:oklch` | — | Parses `{l,c,h,a?}` OKLCH. |
| `intake:lab` | — | Parses `{l,a,b}` CIE Lab D65. |
| `intake:p3` | — | Parses `color(display-p3 r g b [/ alpha])` strings. |
| `intake:named` | — | Parses CSS named color strings (e.g. `rebeccapurple`). |
| `intake:imagePixels` | — | Parses `ImageData` or `{data, width, height}`, pushing non-transparent pixels. |
| `clamp:oklch` | — | Clamps each color's OKLCH lightness and chroma into role-defined (or default) ranges. |
| `clamp:count` | — | Reduces colors to `maxColors` (default 64) via weighted median-cut clustering when exceeded. |
| `resolve:roles` | — | Assigns colors to schema roles by hint match then OKLCH distance, then nudges into declared ranges. |
| `expand:family` | — | Derives missing roles with `derivedFrom` set, applying OKLCH deltas from the source role. |
| `enforce:contrast` | — | Checks and nudges foreground role colors to meet `minRatio` for each contrast pair. |
| `derive:variant` | — | Produces light/dark variants by transforming all roles. |
| `emit:json` | — | Writes `outputs['core:json']` with `{colors, roles, variants}` flattened to hex strings. |

### `@studnicky/iridis-contrast`

| Task | Requires | Description |
|---|---|---|
| `enforce:wcagAA` | — | Enforces WCAG 2.1 AA contrast (4.5:1 normal text, 3:1 large/UI) on all role pairs. |
| `enforce:wcagAAA` | — | Enforces WCAG 2.1 AAA contrast (7:1 normal text, 4.5:1 large/UI). |
| `enforce:apca` | — | Enforces APCA (WCAG 3 draft) Lc targets: 75 body text, 60 fluent text, 45 non-text UI. |
| `enforce:cvdSimulate` | — | Simulates protanopia/deuteranopia/tritanopia/achromatopsia against published thresholds; advisory by default, auto-corrects when `input.contrast.cvdCorrect` is true. |

### `@studnicky/iridis-image`

| Task | Requires | Description |
|---|---|---|
| `gallery:histogram` | — | Quantizes pixels into a 5-bit-per-channel histogram; emits weighted records keyed by bin centroid. |
| `gallery:extract` | — | Reduces input records to K dominant colors via median-cut (weighted) or deltaE-merge clustering. |
| `gallery:assignRoles` | — | Assigns dominant colors to gallery roles: `canvas`, `frame`, `accent`, `muted`, `text`. |
| `gallery:harmonize` | — | Shifts accent hue by 30° when its `deltaE2000` distance to the frame color is under 10. |

### `@studnicky/iridis-vscode`

| Task | Requires | Description |
|---|---|---|
| `vscode:expandTokens` | — | Derives 23 VS Code base token colors from the 16 resolved roles. |
| `vscode:applyModifiers` | `vscode:expandTokens` | Applies 10 color modifiers to base tokens, producing 253 semantic-token rules with re-enforced contrast. |
| `emit:vscodeSemanticRules` | `vscode:applyModifiers` | Shapes the semantic-token rule map for `editor.semanticTokenColorCustomizations.rules`. |
| `emit:vscodeUiPalette` | — | Derives 100+ VS Code workbench colors from the 16-role palette. |
| `emit:vscodeThemeJson` | `emit:vscodeSemanticRules`, `emit:vscodeUiPalette` | Assembles the complete `theme.json`: `{ name, type, colors, semanticTokenColors, tokenColors }`. |

### `@studnicky/iridis-stylesheet`

| Task | Requires | Description |
|---|---|---|
| `emit:cssVars` | — | Emits CSS custom property blocks from resolved roles and variants. |
| `emit:cssVarsScoped` | — | Emits per-category scoped CSS custom property blocks for Vue/Capacitor use cases. |

### `@studnicky/iridis-tailwind`

| Task | Requires | Description |
|---|---|---|
| `emit:tailwindTheme` | — | Emits a Tailwind `theme.colors` object and config module from resolved roles. |

### `@studnicky/iridis-shadcn`

| Task | Requires | Description |
|---|---|---|
| `emit:shadcnTheme` | — | Emits a shadcn/ui-compatible CSS custom-property theme (OKLCH, Tailwind v4 convention) from resolved roles. |

### `@studnicky/iridis-mui`

| Task | Requires | Description |
|---|---|---|
| `emit:muiTheme` | — | Emits an MUI `createTheme()` palette object from resolved roles and shade variants. |

### `@studnicky/iridis-chakra`

| Task | Requires | Description |
|---|---|---|
| `emit:chakraTheme` | — | Emits a Chakra UI `extendTheme()` color-token scale (100/500/900 per family) from resolved roles and dark/light variants. |

### `@studnicky/iridis-panda`

| Task | Requires | Description |
|---|---|---|
| `emit:pandaTheme` | — | Emits Panda CSS token config and a UnoCSS-compatible theme object from the same resolved-role color map. |

### `@studnicky/iridis-capacitor`

| Task | Requires | Description |
|---|---|---|
| `emit:capacitorStatusBar` | — | Emits Capacitor `StatusBar` configuration from the `surface`/`topBar` role. |
| `emit:capacitorSplashScreen` | — | Emits Capacitor splash screen configuration from `surface` or an input-specified `splashRole`. |
| `emit:capacitorTheme` | — | Emits a flat Capacitor theme map from resolved roles for native preference storage. |
| `emit:androidThemeXml` | — | Emits an Android `themes.xml` fragment for the Capacitor splash screen and status bar. |

### `@studnicky/iridis-rdf`

| Task | Requires | Description |
|---|---|---|
| `reason:annotate` | — | Annotates the palette with RDF triples via an `n3` Store. |
| `reason:serialize` | — | Serializes `rdf:reasoningGraph` to Turtle / TriG / N-Quads / JSON-LD. |
