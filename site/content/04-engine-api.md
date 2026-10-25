---
title: 4. Long-form Engine API
description: Construct the Engine directly for custom schemas, explicit contrast checking, or plugin emitters.
---

`QuickPalette.resolve(...)` covers the simple case. When you need custom schemas, explicit contrast checking, or plugin emitters, construct the `Engine` directly.

```ts
import { Engine, coreTasks } from '@studnicky/iridis';
import { contrastPlugin } from '@studnicky/iridis-contrast';
import { stylesheetPlugin } from '@studnicky/iridis-stylesheet';
import { shadcnPlugin } from '@studnicky/iridis-shadcn';

const engine = new Engine();
// Register core tasks
for (const task of coreTasks) engine.tasks.register(task);

// Adopt output plugins
engine.adopt(contrastPlugin);
engine.adopt(stylesheetPlugin);
engine.adopt(shadcnPlugin);

// Declare the execution sequence
engine.pipeline([
  'intake:any',
  'resolve:roles',
  'expand:family',
  'enforce:compliance',
  'derive:variant',
  'report:compliance',
  'withhold:compliance',
  'emit:cssVars',
  'emit:shadcnVars'
]);

// Run the pipeline
const state = engine.run({
  colors: ['#8B5CF6'],
  roles: yourRoleSchema,
  contrast: {
    algorithm: 'wcag21',
    cvdMode: 'nudge',
    enableStrictCompliance: false,
    level: 'AA',
    nonMandatoryLevel: 'AA',
  },
});

// Outputs and the terminal compliance report share one resolved state.
console.log(state.outputs['stylesheet:cssVars']);
console.log(state.metadata['contrast:complianceReport']);
```

## Two ways to run

iridis works as an NPM library AND as a CLI tool.

### As a library

Construct `new Engine()`, register the core tasks (`coreTasks`), `adopt()` the plugins you want, declare your `pipeline()` order, and call `run(input)`. Math primitives are independent singletons; import any of them directly from `@studnicky/iridis` when you need to call colour math outside the pipeline.

## Compliance configuration and reports

`input.contrast` is the single configuration boundary for selected contrast standards, color-vision-deficiency work, non-mandatory pairs, and strict output handling. `algorithm` selects `wcag21` or `apca`; `level` selects the mandatory-pair target. `nonMandatoryLevel` selects `AA` or `AAA` for schema-declared non-mandatory pairs and defaults to `AA`.

`cvdMode` defaults to `warn`. `warn` reports simulated CVD floor and drop evidence without changing roles. `nudge` attempts bounded corrections for unpinned roles and preserves unresolved evidence as advisory. `enforce` applies the same bounded correction and leaves unresolved CVD constraints in the terminal report.

`enableStrictCompliance` defaults to `false`. A non-strict run returns the closest bounded palette with `disposition: 'best-effort'` when pairs remain unresolved. A strict run preserves the same best-achievable roles and variants, but writes `disposition: 'withheld'`; consumers use that disposition to avoid admitting the palette.

`report:compliance` writes `metadata['contrast:complianceReport']` as `{ compliant, disposition, selected, pairs, problemPairs }`. `problemPairs` is the stable failing subset of `pairs`. Every pair reports `foreground`, `background`, `required`, `actual`, `shortfall`, `passed`, `adjustedRoles`, and `constraints`. A failing pair can also carry `proof`, which identifies the best reachable value and its limiting bounds.

Schema authors can inspect constraints before running a palette:

```ts
import { ContrastFeasibility } from '@studnicky/iridis-contrast';

const feasibility = ContrastFeasibility.analyzeSchema(yourRoleSchema, {
  algorithm: 'wcag21',
  cvdMode: 'nudge',
  level: 'AA',
  nonMandatoryLevel: 'AA',
});
```

The advisory reports `always-reachable`, `never-reachable`, `reachable-only-for-some-hues`, or `indeterminate` for each declared pair. Indeterminate results retain sampled evidence, which is labelled as sampled rather than proof.

### Demo controls

The Schema card on this site exposes each `input.contrast` field as a control:

| Control | `input.contrast` field | Values |
|---|---|---|
| Contrast target | `algorithm` + `level` | AA, AAA, APCA |
| Non-mandatory level | `nonMandatoryLevel` | `AA`, `AAA` |
| CVD mode | `cvdMode` | `warn`, `nudge`, `enforce` |
| Strict compliance | `enableStrictCompliance` | on, off |

Changing a control reruns the pipeline and the schema reachability list. The reachability list shows one badge per declared pair, the limiting bounds for pairs that cannot be met, and the hue ranges for pairs that depend on the seed. A failing pair in the accessibility toast names its best reachable value and the bound that limits it.

### Performance

Feasibility and CVD correction run on closed-form and bounded numeric paths rather than sampling.

- `analyzeSchema` certifies neutral, shared-root, and independent-root hue envelopes with interval witnesses over the lightness/chroma corners of each role. A role schema with 32 roles analyzes in about 25 ms.
- Repair scoring, proofs, and CVD range pruning share one numeric `ColorCoordinate` model, which `@studnicky/iridis/math` exports for callers that score candidates themselves.
- CVD correction runs against a fixed search budget per run. A run that exhausts its budget returns the best candidate found and reports the unresolved constraints.
- The demo runs palette work and the schema reachability check in one engine worker; the check uses latest-wins sequencing so a stale reply never overwrites a newer result.

### Safety

- Roles stated by the caller are pinned: no step mutates them, and a pair with both endpoints pinned reports the `pin` constraint rather than moving either side.
- `enableStrictCompliance` never discards the resolved palette. It changes `disposition` to `withheld`; the consumer decides whether to admit it. The demo keeps the last admitted palette on screen while a withheld palette's report stays visible.
- Every shortfall is reported with its `constraints`, so an unresolved pair names the range, gamut, hue-relationship, pin, or CVD limit that blocks it.
- A `proof` is present only when the analyzer can state it. Sampled evidence is labelled as sampled and is never presented as proof.

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
- **`contrastPairs`** — a declarative accessibility contract, not a styling hint: `enforce:compliance` solves every declared pair after `resolve:roles` and `expand:family`. It preserves authored hue relationships and range envelopes, keeps stated roles exact, and may adjust either unpinned endpoint inside its declared constraints. Declare a pair for every foreground/background combination that renders together; the terminal report records the target, achieved value, shortfall, and limiting constraints for any pair that remains unresolved.
