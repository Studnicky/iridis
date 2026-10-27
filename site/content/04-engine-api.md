---
title: Long-form Engine API
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
  'derive:roleRelations',
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

`input.contrast` is the configuration boundary for selected contrast standards, color-vision-deficiency work, non-mandatory pairs, and strict output handling. `algorithm` selects `wcag21` or `apca`; `level` selects the mandatory-pair target. `nonMandatoryLevel` selects `AA` or `AAA` for schema-declared non-mandatory pairs and defaults to `AA`.

`cvdMode` defaults to `warn`. `warn` reports simulated CVD floor and drop evidence without changing roles. `nudge` attempts bounded corrections for unpinned roles and preserves unresolved evidence as advisory. `enforce` applies the same bounded correction and leaves unresolved CVD constraints in the terminal report.

`enableStrictCompliance` defaults to `false`. A non-strict run returns the closest bounded palette with `disposition: 'best-effort'` when pairs remain unresolved. A strict run preserves the same best-achievable roles and variants, but writes `disposition: 'withheld'`; consumers use that disposition to avoid admitting the palette.

`report:compliance` writes `metadata['contrast:complianceReport']` as `{ compliant, disposition, selected, pairs, problemPairs }`. `problemPairs` is the stable failing subset of `pairs`. Every pair reports `foreground`, `background`, `required`, `actual`, `shortfall`, `passed`, `adjustedRoles`, and `constraints`. A relationship-constrained pair also carries sorted `relationIds`, which join it to `core:relationshipResolution`. A failing pair can carry `proof`, which identifies the best reachable value and its limiting bounds.

A relationship graph resolves each role target through one authored relationship before compliance. For each lightness and chroma coordinate, an operation that explicitly computes it is clamped into the target range; an operation that preserves a source coordinate uses the target range midpoint when that range exists, and otherwise preserves the source coordinate. A source-less `hue-target` retains its already-resolved target lightness, chroma, and alpha. A resolved relationship target uses its relationship baseline rather than a raw-seed distance objective; source-less `hue-target` and stated roles retain their seed-distance objective. `core:relationshipResolution.after` records this final coordinate result. Fixed relationships retain that record; tolerant relationships constrain movement to their declared channel deltas. `relationIds` identifies relationships incident to a pair rather than CVD causation. CVD metadata records `relationshipCandidateRejections` per mover group as diagnostic evidence when a relationship rejects candidate colors. An `alpha-overlay` target is evaluated as its source-over composite. Schema analysis marks an alpha-overlay pair indeterminate with sampled evidence unless interval bounds can certify it.

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

- `analyzeSchema` certifies neutral, shared-root, and independent-root hue envelopes with interval witnesses over each role's authored lightness and chroma bounds.
- Repair scoring, proofs, and CVD range pruning share one numeric `ColorCoordinate` model, which `@studnicky/iridis/math` exports for callers that score candidates themselves.
- CVD correction runs against a fixed search budget per run. A run that exhausts its budget returns the best candidate found and reports the unresolved constraints.
- The demo runs palette work and the schema reachability check in an engine worker; the check uses latest-wins sequencing so a stale reply never overwrites a newer result.

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
- **`intent`** — the classifier that drives forced-colors (WHCM) token selection, the APCA Lc target, the default WCAG ratio, and Capacitor StatusBar style. The role-definition schema declares the supported values. iridis never infers intent from the role name: when intent is omitted it stays undefined and each downstream task applies its documented generic default. Declare it whenever semantic output matters.
- **`required`** — when intake yields no colors, `resolve:roles` synthesizes a required role from its declared range centers. With available colors, required and optional roles use the same hint/distance assignment. Mark a role required only when downstream code needs a concrete fallback.
- **`relationshipGraph`** — author derivation through `alias`, `hue-offset`, `hue-target`, `oklch-delta`, `oklch-interpolate`, or `alpha-overlay`. `derive:roleRelations` resolves acyclic relationships regardless of schema order; missing sources and cycles remain unresolved with recorded relationship state. A `hue-target` may omit `source` to nudge the target role's independently resolved candidate toward its authored hue.
- **`lightnessRange`** / **`chromaRange`** — `resolve:roles` pushes an assigned seed's OKLCH lightness and chroma into these bounds. Relationship operations explicitly computing a coordinate clamp it into the target range; operations preserving a source coordinate use the target range midpoint when declared. Author ranges that preserve the intended perceptual zone while leaving sufficient room for declared contrast requirements and the target gamut.
- **`contrastPairs`** — a declarative accessibility contract, not a styling hint. Every pair declares a `contrastClass`: `text` pairs are held to the selected text level (AA 4.5:1 or AAA 7:1), while `non-text` and `ui` pairs (graphics and interface boundaries) are held to their declared minimum, 3:1 when none is declared, and to 4.5:1 under non-mandatory AAA. `enforce:compliance` solves every declared pair after `resolve:roles` and `derive:roleRelations`. It preserves authored relationship constraints and range envelopes, keeps stated roles exact, and may adjust either unpinned endpoint inside its declared constraints. Declare a pair for every foreground/background combination that renders together; the terminal report records the target, achieved value, shortfall, and limiting constraints for any pair that remains unresolved.
