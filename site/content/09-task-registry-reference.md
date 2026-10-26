---
title: Task Registry Reference
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
| `clamp:count` | `colors`, `input.maxColors`, `input.bypass` | `colors` | — | Reduces colors to `maxColors` through weighted median-cut clustering when exceeded. |
| `resolve:roles` | `colors`, `input.roles`, `metadata` | `roles`, `metadata` | — | Assigns colors to schema roles by hint match then OKLCH distance, then nudges into declared ranges. |
| `derive:roleRelations` | `roles`, `input.roles`, `metadata` | `roles`, `metadata['core:relationshipResolution']` | — | Resolves each authored relationship target and records typed per-role relationship resolution metadata. |
| `enforce:contrast` | `roles`, `input.roles`, `input.contrast` | `roles`, `metadata['core:contrastReport']` | — | Core stage over the shared contrast policy: enforces every declared contrast pair, including `minRatio` and optional `maxRatio` bounds, moves only derived endpoints, preserves stated roles, and writes the typed `{compliant, pairs}` object to `core:contrastReport`. |
| `derive:variant` | `roles`, `metadata['core:variantConfig']` | `variants` | — | Produces light/dark variants by transforming all roles. |
| `emit:json` | `colors`, `roles`, `variants` | `outputs['core:json']` | — | Writes `outputs['core:json']` with `{colors, roles, variants}` flattened to hex strings. |

## `@studnicky/iridis-contrast`

| Task | Reads | Writes | Requires | Description |
|---|---|---|---|---|
| `enforce:compliance` | `roles`, `input.roles`, `input.contrast`, `metadata['core:roleProvenance']` | `roles`, `metadata['contrast:cvd']`, `metadata['contrast:complianceReport']` | — | Resolves the selected standard (`input.contrast`) over every declared pair, runs CVD correction as a validator and refiner of the same policy, and moves only derived endpoints. Stated roles keep their exact color. |
| `report:compliance` | `roles`, `metadata['contrast:cvd']` | `metadata['contrast:complianceReport']` | — | Measures the final roles and writes `{compliant, disposition, selected, pairs, problemPairs}`, where `disposition` is `resolved`, `best-effort` or `withheld`, `problemPairs` is the failing subset of `pairs`, and each pair carries `required`, `actual`, `shortfall`, `adjustedRoles` and `constraints`, and a failing pair may carry a `proof` with its best reachable value and limiting bounds. |
| `withhold:compliance` | `roles`, `variants`, `input.contrast`, `metadata['contrast:complianceReport']` | `roles`, `variants`, `metadata['contrast:complianceReport']` | — | Runs last. When `input.contrast.enableStrictCompliance` is true and the report has problem pairs, sets the report `disposition` to `withheld` and keeps the roles and variants as the closest palette; the consumer decides whether to admit it. Otherwise the closest palette is the result. |

## `@studnicky/iridis-image`

| Task | Reads | Writes | Requires | Description |
|---|---|---|---|---|
| `gallery:histogram` | `colors` | `colors`, `metadata.gallery:histogram` | — | Quantizes pixels into a histogram and emits weighted records keyed by bin centroid. |
| `gallery:extract` | `colors`, `metadata.gallery` | `colors`, `metadata.gallery:dominantColors` | — | Reduces input records to K dominant colors via median-cut (weighted), deltaE-merge, Wu quantize, or k-means clustering. |
| `gallery:extractCandidates` | `colors`, `metadata.gallery` | `metadata.gallery:candidates` | — | Non-destructive sibling of `gallery:extract`: runs several clustering configs against the same input and collects each as a labeled candidate palette. |
| `gallery:assignRoles` | `colors` | `roles` | — | Assigns dominant colors to gallery roles: `canvas`, `frame`, `accent`, `muted`, `text`. |
| `gallery:harmonize` | `roles`, `metadata.gallery` | `roles.accent`, `metadata.gallery:harmonized` | — | Shifts accent hue when its `deltaE2000` distance to the frame color is below the harmonization threshold. |

## `@studnicky/iridis-vscode`

| Task | Reads | Writes | Requires | Description |
|---|---|---|---|---|
| `vscode:seedRoles` | `input.colors`, `runtime.framing` | `colors` | — | Validates the `{ tier, framing, roles }` palette body, requires matching framing, and creates named seed records for the selected tier's exact key set. |
| `vscode:deriveUiRoles` | `roles`, `metadata.core:roleProvenance` | `roles` | `expand:family` | Derives missing UI extension roles from the resolved vocabulary and preserves caller-stated role values. |
| `vscode:expandTokens` | `roles`, `runtime.framing`, `variants` | `metadata.vscode:baseTokens` | — | Derives syntax and TextMate base tokens from the resolved framing surface. |
| `vscode:applyModifiers` | `metadata.vscode:baseTokens`, `roles`, `runtime.framing`, `variants` | `metadata.vscode:semanticTokenRules` | `vscode:expandTokens` | Creates semantic-token rules and applies background contrast enforcement. |
| `emit:vscodeSemanticRules` | `metadata.vscode:semanticTokenRules`, `metadata.vscode:baseTokens` | `outputs.vscode:semanticTokenRules` | `vscode:applyModifiers` | Shapes semantic rules for VS Code’s semantic-token customisation map. |
| `emit:vscodeUiPalette` | `roles`, `runtime.framing`, `variants` | `outputs.vscode:workbenchColors` | `vscode:deriveUiRoles` | Emits registry-backed workbench colour slots from the resolved vocabulary. |
| `emit:vscodeThemeJson` | `outputs.vscode:workbenchColors`, `outputs.vscode:semanticTokenRules`, `metadata.vscode:baseTokens`, `roles`, `runtime.framing`, `variants` | `outputs.vscode:themeJson` | `emit:vscodeSemanticRules`, `emit:vscodeUiPalette` | Assembles `{ name, type, colors, semanticTokenColors, tokenColors }`. |

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
| `emit:chakraTheme` | `roles`, `variants` | `outputs.chakra:theme` | — | Emits a Chakra UI `extendTheme()` color-token scale from resolved roles and dark/light variants. |

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
