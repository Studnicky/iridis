---
title: 9. Task Registry Reference
description: Every task registered by the core engine and each official plugin, grouped by plugin.
---

Every task registered by the core engine and by each official plugin, grouped by plugin. `name` is the pipeline identifier passed to `engine.pipeline([...])`. `Reads`/`Writes` are the `state` slots the task's manifest declares. `Requires` (where present) lists tasks that must already have run in the same pipeline; a manifest that lists non-task strings there (e.g. a math primitive name) is documenting an internal dependency, not pipeline ordering, and is omitted from this column.

## Core (`@studnicky/iridis`)

| Task | Reads | Writes | Requires | Description |
|---|---|---|---|---|
| `intake:any` | `input.colors` | `colors` | — | Recommended default intake task. Dispatches each entry to the first matching format delegate. |
| `intake:hex` | `input.colors` | `colors` | — | Parses `#RRGGBB`, `#RGB`, and 8-digit hex strings. |
| `intake:rgb` | `input.colors` | `colors` | — | Parses `{r,g,b,a?}` in 0..1 or 0..255 (auto-detected). |
| `intake:hsl` | `input.colors` | `colors` | — | Parses `{h,s,l,a?}`. |
| `intake:oklch` | `input.colors` | `colors` | — | Parses `{l,c,h,a?}` OKLCH. |
| `intake:lab` | `input.colors` | `colors` | — | Parses `{l,a,b}` CIE Lab D65. |
| `intake:p3` | `input.colors` | `colors` | — | Parses `color(display-p3 r g b [/ alpha])` strings. |
| `intake:named` | `input.colors` | `colors` | — | Parses CSS named color strings (e.g. `rebeccapurple`). |
| `intake:imagePixels` | `input.colors` | `colors` | — | Parses `ImageData` or `{data, width, height}`, pushing non-transparent pixels. |
| `clamp:oklch` | `colors`, `input.roles` | `colors` | — | Clamps each color's OKLCH lightness and chroma into role-defined (or default) ranges. |
| `clamp:count` | `colors`, `input.maxColors`, `input.bypass` | `colors` | — | Reduces colors to `maxColors` (default 64) via weighted median-cut clustering when exceeded. |
| `resolve:roles` | `colors`, `input.roles`, `metadata` | `roles`, `metadata` | — | Assigns colors to schema roles by hint match then OKLCH distance, then nudges into declared ranges. |
| `expand:family` | `roles`, `input.roles`, `metadata` | `roles` | — | Derives missing roles with `derivedFrom` set, applying OKLCH deltas from the source role. |
| `enforce:contrast` | `roles`, `input.roles`, `input.contrast` | `roles`, `metadata['core:contrastReport']` | — | Checks and nudges foreground role colors to meet `minRatio` for each contrast pair. |
| `derive:variant` | `roles`, `metadata['core:variantConfig']` | `variants` | — | Produces light/dark variants by transforming all roles. |
| `emit:json` | `colors`, `roles`, `variants` | `outputs['core:json']` | — | Writes `outputs['core:json']` with `{colors, roles, variants}` flattened to hex strings. |

## `@studnicky/iridis-contrast`

| Task | Reads | Writes | Requires | Description |
|---|---|---|---|---|
| `enforce:wcagAA` | `input.roles.contrastPairs`, `roles` | `roles`, `metadata['contrast:aa']` | — | Enforces WCAG 2.1 AA contrast (4.5:1 normal text, 3:1 large/UI) on all role pairs. |
| `enforce:wcagAAA` | `input.roles.contrastPairs`, `roles` | `roles`, `metadata['contrast:aaa']` | — | Enforces WCAG 2.1 AAA contrast (7:1 normal text, 4.5:1 large/UI). |
| `enforce:apca` | `input.roles.contrastPairs`, `roles` | `roles`, `metadata['contrast:apca']` | — | Enforces APCA (WCAG 3 draft) Lc targets: 75 body text, 60 fluent text, 45 non-text UI. |
| `enforce:cvdSimulate` | `input.roles.contrastPairs`, `input.contrast.cvdCorrect`, `roles` | `roles`, `metadata['contrast:cvd']` | — | Simulates protanopia/deuteranopia/tritanopia/achromatopsia against published thresholds; advisory by default, auto-corrects when `input.contrast.cvdCorrect` is true. |

## `@studnicky/iridis-image`

| Task | Reads | Writes | Requires | Description |
|---|---|---|---|---|
| `gallery:histogram` | `colors` | `colors`, `metadata.gallery:histogram` | — | Quantizes pixels into a 5-bit-per-channel histogram; emits weighted records keyed by bin centroid. |
| `gallery:extract` | `colors`, `metadata.gallery` | `colors`, `metadata.gallery:dominantColors` | — | Reduces input records to K dominant colors via median-cut (weighted), deltaE-merge, Wu quantize, or k-means clustering. |
| `gallery:extractCandidates` | `colors`, `metadata.gallery` | `metadata.gallery:candidates` | — | Non-destructive sibling of `gallery:extract`: runs several clustering configs against the same input and collects each as a labeled candidate palette. |
| `gallery:assignRoles` | `colors` | `roles` | — | Assigns dominant colors to gallery roles: `canvas`, `frame`, `accent`, `muted`, `text`. |
| `gallery:harmonize` | `roles`, `metadata.gallery` | `roles.accent`, `metadata.gallery:harmonized` | — | Shifts accent hue by 30° when its `deltaE2000` distance to the frame color is under 10. |

## `@studnicky/iridis-vscode`

| Task | Reads | Writes | Requires | Description |
|---|---|---|---|---|
| `vscode:expandTokens` | `roles` | `metadata.vscode:baseTokens` | — | Derives 23 VS Code base token colors from the 16 resolved roles. |
| `vscode:applyModifiers` | `metadata.vscode:baseTokens`, `roles` | `metadata.vscode:semanticTokenRules` | `vscode:expandTokens` | Applies the modifier-transform table to base tokens, producing per-type × per-modifier semantic-token rules with re-enforced contrast. |
| `emit:vscodeSemanticRules` | `metadata.vscode:semanticTokenRules`, `metadata.vscode:baseTokens` | `outputs.vscode:semanticTokenRules` | `vscode:applyModifiers` | Shapes the semantic-token rule map for `editor.semanticTokenColorCustomizations.rules`. |
| `emit:vscodeUiPalette` | `roles` | `outputs.vscode:workbenchColors` | — | Derives 100+ VS Code workbench colors from the 16-role palette. |
| `emit:vscodeThemeJson` | `outputs.vscode:workbenchColors`, `outputs.vscode:semanticTokenRules`, `metadata.vscode:baseTokens` | `outputs.vscode:themeJson` | `emit:vscodeSemanticRules`, `emit:vscodeUiPalette` | Assembles the complete `theme.json`: `{ name, type, colors, semanticTokenColors, tokenColors }`. |

## `@studnicky/iridis-stylesheet`

| Task | Reads | Writes | Requires | Description |
|---|---|---|---|---|
| `emit:cssVars` | `roles`, `variants`, `metadata` | `outputs.stylesheet:cssVars` | — | Emits CSS custom property blocks from resolved roles and variants. |
| `emit:cssVarsScoped` | `roles`, `variants`, `metadata` | `outputs.stylesheet:cssVarsScoped` | — | Emits per-category scoped CSS custom property blocks for Vue/Capacitor use cases. |

## `@studnicky/iridis-tailwind`

| Task | Reads | Writes | Requires | Description |
|---|---|---|---|---|
| `emit:tailwindTheme` | `roles`, `metadata` | `outputs.tailwind:theme` | — | Emits a Tailwind `theme.colors` object and config module from resolved roles. |

## `@studnicky/iridis-shadcn`

| Task | Reads | Writes | Requires | Description |
|---|---|---|---|---|
| `emit:shadcnTheme` | `roles` | `outputs.shadcn:theme` | — | Emits a shadcn/ui-compatible CSS custom-property theme (OKLCH, Tailwind v4 convention) from resolved roles. |

## `@studnicky/iridis-mui`

| Task | Reads | Writes | Requires | Description |
|---|---|---|---|---|
| `emit:muiTheme` | `roles`, `variants`, `runtime` | `outputs.mui:theme` | — | Emits an MUI `createTheme()` palette object from resolved roles and shade variants. |

## `@studnicky/iridis-chakra`

| Task | Reads | Writes | Requires | Description |
|---|---|---|---|---|
| `emit:chakraTheme` | `roles`, `variants` | `outputs.chakra:theme` | — | Emits a Chakra UI `extendTheme()` color-token scale (100/500/900 per family) from resolved roles and dark/light variants. |

## `@studnicky/iridis-panda`

| Task | Reads | Writes | Requires | Description |
|---|---|---|---|---|
| `emit:pandaTheme` | `roles` | `outputs.panda:theme` | — | Emits Panda CSS token config and a UnoCSS-compatible theme object from the same resolved-role color map. |

## `@studnicky/iridis-capacitor`

| Task | Reads | Writes | Requires | Description |
|---|---|---|---|---|
| `emit:capacitorStatusBar` | `roles` | `outputs.capacitor:statusBar` | — | Emits Capacitor `StatusBar` configuration from the `surface`/`topBar` role. |
| `emit:capacitorSplashScreen` | `roles`, `metadata.capacitor.splashRole`, `metadata.capacitor.androidSplashResourceName` | `outputs.capacitor:splashScreen` | — | Emits Capacitor splash screen configuration from `surface` or an input-specified `splashRole`. |
| `emit:capacitorTheme` | `roles`, `variants` | `outputs.capacitor:theme` | — | Emits a flat Capacitor theme map from resolved roles for native preference storage. |
| `emit:androidThemeXml` | `roles`, `outputs.capacitor:statusBar`, `outputs.capacitor:splashScreen` | `outputs.capacitor:androidThemeXml` | — | Emits an Android `themes.xml` fragment for the Capacitor splash screen and status bar. |

## `@studnicky/iridis-rdf`

| Task | Reads | Writes | Requires | Description |
|---|---|---|---|---|
| `reason:annotate` | `roles`, `colors` | `outputs['rdf:reasoningGraph']` | — | Annotates the palette with RDF triples via an `n3` Store. |
| `reason:serialize` | `outputs['rdf:reasoningGraph']`, `metadata['rdf:format']` | `outputs['rdf:serialized']` | — | Serializes `rdf:reasoningGraph` to Turtle / TriG / N-Quads / JSON-LD. |
