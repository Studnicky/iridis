---
title: 4. Long-form Engine API
description: Construct the Engine directly for custom schemas, explicit contrast checking, or plugin emitters.
---

`QuickPalette.resolve(...)` covers the simple case. When you need custom schemas, explicit contrast checking, or plugin emitters, construct the `Engine` directly.

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
  'resolve:roles',
  'expand:family',
  'enforce:contrast',
  'derive:variant',
  'emit:cssVars',
  'emit:shadcnVars'
]);

// Run the pipeline
const state = engine.run({
  colors: ['#8B5CF6'],
  roles: yourRoleSchema,
  contrast: { level: 'AA' },
});

// The results are available in state.outputs
console.log(state.outputs['stylesheet:cssVars']);
```

## Two ways to run

iridis works as an NPM library AND as a CLI tool.

### As a library

Construct `new Engine()`, register the core tasks (`coreTasks`), `adopt()` the plugins you want, declare your `pipeline()` order, and call `run(input)`. Math primitives are independent singletons; import any of them directly from `@studnicky/iridis` when you need to call colour math outside the pipeline.

### As a CLI

Install `@studnicky/iridis-cli`, write a JSON config with `enable*` flags, and run:

```bash
iridis ./palette.config.json
```

Same engine, same plugins. The CLI dynamically imports only the plugins whose `enable*` flag is true. Use it in build scripts, CI, or one-off generation jobs. See [CLI Usage](#07-cli-usage) for the full config shape.

## Role schemas (`yourRoleSchema`)

A role schema is a consumer-authored contract: a `name`, an optional `description`, an array of `roles`, and an optional array of `contrastPairs`. iridis never infers meaning from a role's name — every downstream decision reads the role's declared `intent` instead. Each entry in `roles[]` is a `RoleDefinitionInterface`:

- **`name`** — becomes the suffix of the emitted CSS custom property (`--iridis-{name}`) and the key every downstream task uses to look up `state.roles[name]`. Keep it lowercase kebab-case and stable; renaming a role is a breaking change for every consumer reading `--iridis-{old-name}`.
- **`intent`** — the classifier that drives forced-colors (WHCM) token selection, the APCA Lc target, the default WCAG ratio, and Capacitor StatusBar style. It's one of ten values (`text`, `background`, `accent`, `muted`, `critical`, `positive`, `link`, `button`, `onAccent`, `onButton`) grouped into a core, signal, and interaction family. iridis never infers intent from the role name: when intent is omitted it stays undefined and each downstream task applies its documented generic default. Declare it whenever semantic output matters.
- **`required`** — when intake yields no colors, `resolve:roles` synthesizes a required non-derived role from its declared range centers and hue target. With available colors, required and optional roles use the same hint/distance assignment. A derived role still needs a resolvable `derivedFrom` source. Mark a role required only when downstream code needs a concrete fallback.
- **`derivedFrom`** — after `resolve:roles`, `expand:family` derives the child from the resolved source. A declared lightness or chroma range contributes its midpoint; an omitted range preserves the source coordinate. `hueOffset` rotates relative to the source hue. Expansion iterates to a fixed point, so acyclic chains resolve regardless of schema order; missing sources and cycles remain unassigned and produce warnings.
- **`hue`** / **`hueClamp`** — `hue` is a semantic target, and `hueClamp` limits how far the current hue may rotate toward it along the shortest arc. The default limit is 90°. These fields work for directly resolved and `derivedFrom` roles; `hueOffset` is used only when no absolute `hue` target is declared.
- **`lightnessRange`** / **`chromaRange`** — `resolve:roles` pushes an assigned seed's OKLCH lightness and chroma into these bounds. For a derived role, `expand:family` uses each declared range's midpoint. Keep both ranges narrow (lightness ≤ 0.15 wide) for surface and text roles so the result stays inside the role's perceptual zone regardless of seed; widen lightness (≥ 0.20) for accent roles so the seed's identity shows through, and cap chroma around 0.32 for sRGB-only emit targets.
- **`contrastPairs`** — a declarative accessibility contract, not a styling hint: `enforce:contrast` walks each `{ foreground, background, minRatio, algorithm }` pair after `resolve:roles` and `expand:family`, nudging the foreground's OKLCH lightness toward black or white until the ratio passes or the color reaches that pole. The nudge preserves hue and chroma but is not constrained by the role's earlier `lightnessRange`; the terminal report records any pair that still misses its target. Declare a pair for every foreground/background combination that actually renders together, using `wcag21` for the legal floor or `apca` for perceptual accuracy in dark mode and on chromatic backgrounds.
