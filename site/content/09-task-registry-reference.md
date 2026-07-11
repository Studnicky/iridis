---
title: 9. Task Registry Reference
description: Every task registered by the core engine and each official plugin, grouped by plugin.
---

Every task registered by the core engine and by each official plugin, grouped by plugin. `name` is the pipeline identifier passed to `engine.pipeline([...])`; `requires` (where present) lists tasks that must already have run in the same pipeline.

## Core (`@studnicky/iridis`)

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

## `@studnicky/iridis-contrast`

| Task | Requires | Description |
|---|---|---|
| `enforce:wcagAA` | — | Enforces WCAG 2.1 AA contrast (4.5:1 normal text, 3:1 large/UI) on all role pairs. |
| `enforce:wcagAAA` | — | Enforces WCAG 2.1 AAA contrast (7:1 normal text, 4.5:1 large/UI). |
| `enforce:apca` | — | Enforces APCA (WCAG 3 draft) Lc targets: 75 body text, 60 fluent text, 45 non-text UI. |
| `enforce:cvdSimulate` | — | Simulates protanopia/deuteranopia/tritanopia/achromatopsia against published thresholds; advisory by default, auto-corrects when `input.contrast.cvdCorrect` is true. |

## `@studnicky/iridis-image`

| Task | Requires | Description |
|---|---|---|
| `gallery:histogram` | — | Quantizes pixels into a 5-bit-per-channel histogram; emits weighted records keyed by bin centroid. |
| `gallery:extract` | — | Reduces input records to K dominant colors via median-cut (weighted) or deltaE-merge clustering. |
| `gallery:assignRoles` | — | Assigns dominant colors to gallery roles: `canvas`, `frame`, `accent`, `muted`, `text`. |
| `gallery:harmonize` | — | Shifts accent hue by 30° when its `deltaE2000` distance to the frame color is under 10. |

## `@studnicky/iridis-vscode`

| Task | Requires | Description |
|---|---|---|
| `vscode:expandTokens` | — | Derives 23 VS Code base token colors from the 16 resolved roles. |
| `vscode:applyModifiers` | `vscode:expandTokens` | Applies 10 color modifiers to base tokens, producing 253 semantic-token rules with re-enforced contrast. |
| `emit:vscodeSemanticRules` | `vscode:applyModifiers` | Shapes the semantic-token rule map for `editor.semanticTokenColorCustomizations.rules`. |
| `emit:vscodeUiPalette` | — | Derives 100+ VS Code workbench colors from the 16-role palette. |
| `emit:vscodeThemeJson` | `emit:vscodeSemanticRules`, `emit:vscodeUiPalette` | Assembles the complete `theme.json`: `{ name, type, colors, semanticTokenColors, tokenColors }`. |

## `@studnicky/iridis-stylesheet`

| Task | Requires | Description |
|---|---|---|
| `emit:cssVars` | — | Emits CSS custom property blocks from resolved roles and variants. |
| `emit:cssVarsScoped` | — | Emits per-category scoped CSS custom property blocks for Vue/Capacitor use cases. |

## `@studnicky/iridis-tailwind`

| Task | Requires | Description |
|---|---|---|
| `emit:tailwindTheme` | — | Emits a Tailwind `theme.colors` object and config module from resolved roles. |

## `@studnicky/iridis-shadcn`

| Task | Requires | Description |
|---|---|---|
| `emit:shadcnTheme` | — | Emits a shadcn/ui-compatible CSS custom-property theme (OKLCH, Tailwind v4 convention) from resolved roles. |

## `@studnicky/iridis-mui`

| Task | Requires | Description |
|---|---|---|
| `emit:muiTheme` | — | Emits an MUI `createTheme()` palette object from resolved roles and shade variants. |

## `@studnicky/iridis-chakra`

| Task | Requires | Description |
|---|---|---|
| `emit:chakraTheme` | — | Emits a Chakra UI `extendTheme()` color-token scale (100/500/900 per family) from resolved roles and dark/light variants. |

## `@studnicky/iridis-panda`

| Task | Requires | Description |
|---|---|---|
| `emit:pandaTheme` | — | Emits Panda CSS token config and a UnoCSS-compatible theme object from the same resolved-role color map. |

## `@studnicky/iridis-capacitor`

| Task | Requires | Description |
|---|---|---|
| `emit:capacitorStatusBar` | — | Emits Capacitor `StatusBar` configuration from the `surface`/`topBar` role. |
| `emit:capacitorSplashScreen` | — | Emits Capacitor splash screen configuration from `surface` or an input-specified `splashRole`. |
| `emit:capacitorTheme` | — | Emits a flat Capacitor theme map from resolved roles for native preference storage. |
| `emit:androidThemeXml` | — | Emits an Android `themes.xml` fragment for the Capacitor splash screen and status bar. |

## `@studnicky/iridis-rdf`

| Task | Requires | Description |
|---|---|---|
| `reason:annotate` | — | Annotates the palette with RDF triples via an `n3` Store. |
| `reason:serialize` | — | Serializes `rdf:reasoningGraph` to Turtle / TriG / N-Quads / JSON-LD. |
