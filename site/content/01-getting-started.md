---
title: 1. Getting Started
description: Install @studnicky/iridis and derive a contrast-enforced palette in one line or wire up the engine directly.
---

iridis is a chromatic pipeline for dynamic palette derivation. You give it seed colors (hex, RGB, OKLCH, etc.). It runs them through a registered sequence of tasks—intake, role resolution, contrast enforcement, variant derivation, and emission—and returns a role-resolved palette plus any consumer-shaped outputs you requested (CSS variables, Tailwind, Shadcn, MUI, Capacitor, etc.).

The core (`@studnicky/iridis`) ships with zero runtime dependencies. Each output target is a separate plugin package.

## Installation

Install the core package, plus any output plugins you need. 

```bash
# Core only
npm install @studnicky/iridis

# W3C contrast checking + Stylesheet + Shadcn UI outputs
npm install @studnicky/iridis \
  @studnicky/iridis-contrast \
  @studnicky/iridis-stylesheet \
  @studnicky/iridis-shadcn
```

## The simplest call (`quickPalette`)

For basic use cases, you don't even need to configure an engine. Use the `quickPalette` helper:

```ts
import { quickPalette } from '@studnicky/iridis';

const palette = await quickPalette(['#7c3aed', '#06b6d4'], 'dark');
// → { background: '#07061a', foreground: '#f0f0ff', accent: '#7c3aed', muted: '#7e7e9a' }
```

One import, one call. No schema to define, no pipeline to declare. The framing argument (`'dark'` or `'light'`) picks the clamp envelopes, and everything else uses sensible defaults.

## Long-form Engine API

When you need custom schemas, explicit contrast checking, or plugin emitters, construct the `Engine` directly.

```ts
import { Engine, coreTasks }  from '@studnicky/iridis';
import { stylesheetPlugin }   from '@studnicky/iridis-stylesheet';
import { shadcnPlugin }       from '@studnicky/iridis-shadcn';

const engine = new Engine();
// Register core tasks
for (const task of coreTasks) engine.tasks.register(task);

// Adopt output plugins
engine.adopt(stylesheetPlugin);
engine.adopt(shadcnPlugin);

// Declare the execution sequence
engine.pipeline([
  'intake:any',
  'expand:family',
  'resolve:roles',
  'enforce:contrast',
  'derive:variant',
  'emit:cssVars',
  'emit:shadcnVars'
]);

// Run the pipeline
const state = await engine.run({
  colors: ['#8B5CF6'],
  roles: yourRoleSchema,
  contrast: { level: 'AA' },
});

// The results are available in state.outputs
console.log(state.outputs['stylesheet:cssVars']);
```

## Math primitives

iridis exports every internal colour-math primitive as a singleton class (`packages/core/src/math/`). Each has a single `apply()` method — no shared base class, no state. If you only need one calculation, import the singleton directly without touching the pipeline:

```ts
import { luminance, contrastWcag21, oklchToRgb } from '@studnicky/iridis';

const ratio = contrastWcag21.apply(foreground, background);
const rgb = oklchToRgb.apply(0.62, 0.18, 290);
```

The full-formula walkthroughs for WCAG 2.1 and APCA contrast math live in the live demo cards on this site (see the contrast and color-space explorer components), not duplicated here — the table below documents the callable surface only.

### Color-space conversion

| Primitive | Signature | Description |
|---|---|---|
| `hexToRgb` | `apply(hex: string): ColorRecord` | Parses a `#rrggbb`/`#rgb` string into a full `ColorRecord`. |
| `rgbToHex` | `apply(r, g, b): string` | Encodes 0..1 RGB channels back to `#rrggbb`. |
| `rgbToHsl` | `apply(r, g, b, alpha?): HslResult` | Converts sRGB to HSL. |
| `hslToRgb` | `apply(h, s, l, alpha?): ColorRecord` | Converts HSL back to a `ColorRecord`. |
| `rgbToOklch` | `apply(r, g, b, alpha?): ColorRecord` | Converts sRGB to OKLCH via linear-light space. |
| `oklchToRgb` | `apply(l, c, h, alpha?): ColorRecord` | Converts OKLCH to a gamut-mapped sRGB `ColorRecord`. |
| `oklchToRgbRaw` | `apply(l, c, h): Rgb` | Same conversion without gamut mapping or `ColorRecord` wrapping. |
| `oklchToDisplayP3` | `apply(l, c, h): Rgb` | Converts OKLCH into Display P3 primaries for wide-gamut output. |
| `srgbToLinear` / `linearToSrgb` | `apply(r, g, b): Rgb` | sRGB companding transfer functions in each direction. |
| `gamutMapSrgb` | `apply(l, c, h): GamutMapResult` | Reduces OKLCH chroma along a hue line until the color fits the sRGB gamut. |

### Contrast & accessibility

| Primitive | Signature | Description |
|---|---|---|
| `luminance` | `apply(color: ColorRecord): number` | Relative luminance per WCAG 2.1. |
| `contrastWcag21` | `apply(a, b: ColorRecord): number` | WCAG 2.1 contrast ratio between two colors. |
| `contrastApca` | `apply(text, background: ColorRecord): number` | APCA (WCAG 3 draft) perceptual contrast (Lc). |
| `contrastText` | `apply(background: ColorRecord, threshold = 0.179): ColorRecord` | Picks black or white text for a given background by luminance threshold. |
| `ensureContrast` | `apply(...)` | Iteratively nudges a foreground color's OKLCH lightness until it clears a target contrast ratio against a background. Backs `enforce:contrast` and the VS Code modifier pass. |
| `deltaE2000` | `apply(a, b: ColorRecord): number` | CIEDE2000 perceptual color-difference metric. |

### Mixing & adjustment

| Primitive | Signature | Description |
|---|---|---|
| `mixOklch` / `mixSrgb` / `mixHsl` | `apply(a, b: ColorRecord, t: number): ColorRecord` | Linear-interpolate two colors in the named color space. |
| `lighten` / `darken` | `apply(color: ColorRecord, deltaL: number): ColorRecord` | Shifts OKLCH lightness by a delta, clamped to `[0, 1]`. |
| `saturate` / `desaturate` | `apply(color: ColorRecord, deltaC: number): ColorRecord` | Shifts OKLCH chroma by a delta, clamped to `[0, 0.5]`. |
| `hueShift` | `apply(color: ColorRecord, degrees: number): ColorRecord` | Rotates OKLCH hue by the given degrees. |

### Clustering

| Primitive | Signature | Description |
|---|---|---|
| `clusterMedianCut` | `apply(colors, k: number): ColorRecord[]` | Reduces a color set to `k` representative colors via unweighted median-cut. |
| `clusterMedianCutWeighted` | `apply(colors, k: number): ColorRecord[]` | Median-cut variant that weights bins by pixel/sample frequency; backs `gallery:extract` and `clamp:count`. |
| `clusterDeltaEMerge` | `apply(colors, k: number): ColorRecord[]` | Merges colors within a perceptual (`deltaE2000`) distance threshold down to `k` clusters. |

### Utility

| Primitive | Signature | Description |
|---|---|---|
| `clamp` | `apply(min, max, v: number): number` | Generic numeric clamp. |
| `clamp01` | `apply(v: number): number` | Clamps to `[0, 1]`, used throughout the channel/lightness/chroma math. |
| `colorRecordFactory` | — | Builds a fully-populated `ColorRecord` (rgb, oklch, hex, and optional `displayP3`) from any single representation. |

## Two ways to run

iridis works as an NPM library AND as a CLI tool.

### As a library

Construct `new Engine()`, register the core tasks (`coreTasks`), `adopt()` the plugins you want, declare your `pipeline()` order, and call `run(input)`. Math primitives are independent singletons; import any of them directly from `@studnicky/iridis` when you need to call colour math outside the pipeline.

### As a CLI

Install `@studnicky/iridis-cli`, write a JSON config with `enable*` flags, and run:

```bash
iridis ./palette.config.json
```

Same engine, same plugins. The CLI dynamically imports only the plugins whose `enable*` flag is true. Use it in build scripts, CI, or one-off generation jobs. See [Plugins & CLI](/plugins-and-cli) for the full config shape.

## Where next

- [Core Architecture](/architecture), how data flows through the shared `PaletteState`, and the v2 living-color roadmap.
- [Plugins & CLI](/plugins-and-cli), the full plugin ecosystem and CLI config reference.
- [Seamless Integration](/integration), adopting iridis without rewriting your existing CSS.
- [GitHub repository](https://github.com/Studnicky/iridis).
