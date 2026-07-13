---
title: 4. Long-form Engine API
description: Construct the Engine directly for custom schemas, explicit contrast checking, or plugin emitters.
---

`quickPalette` covers the simple case. When you need custom schemas, explicit contrast checking, or plugin emitters, construct the `Engine` directly.

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
- **`intent`** — the classifier that drives forced-colors (WHCM) token selection, the APCA Lc target, the default WCAG ratio, and Capacitor StatusBar style. It's one of ten values (`text`, `background`, `accent`, `muted`, `critical`, `positive`, `link`, `button`, `onAccent`, `onButton`) grouped into a core, signal, and interaction family. Always set it explicitly — a role without one falls back to unstable name-substring inference.
- **`required`** — `resolve:roles` gives required roles first pick of the available seeds, so a required role never ends up unassigned; optional roles without a seed stay undefined unless `derivedFrom` synthesises them. Mark a role required only when downstream code would break without it, and pair it with a tight `lightnessRange` / `chromaRange`.
- **`derivedFrom`** — after `resolve:roles`, `expand:family` copies the parent role's resolved L and C (clamped to the child's own ranges), rotates the parent's hue by `hueOffset`, and reconstructs the child's color. Pick `hueOffset` in multiples of 30° for perceptually distinct siblings, and avoid chaining derivations more than two levels deep — `expand:family` is a single pass, so a grandchild only sees its parent's pre-expansion state.
- **`hueLock`** — the anti-parametric option: instead of following another role's hue, the role owns a fixed hue that `resolve:roles` substitutes before clamping L and C. Reserve it for roles with a culturally fixed color association (success reads green, error reads red) regardless of brand seed; it's mutually exclusive with `derivedFrom`.
- **`lightnessRange`** / **`chromaRange`** — `clamp:oklch` pushes a seed's OKLCH lightness and chroma into these bounds, leaving hue untouched. Keep both ranges narrow (lightness ≤ 0.15 wide) for surface and text roles so the result stays inside the role's perceptual zone regardless of seed; widen lightness (≥ 0.20) for accent roles so the seed's identity shows through, and cap chroma around 0.32 for sRGB-only emit targets.
- **`contrastPairs`** — a declarative accessibility contract, not a styling hint: `enforce:contrast` walks each `{ foreground, background, minRatio, algorithm }` pair after `resolve:roles` and `expand:family`, nudging the foreground's OKLCH lightness (lift for dark framing, drop for light) until the ratio passes or the role's envelope is exhausted. Declare a pair for every foreground/background combination that actually renders together, using `wcag21` for the legal floor or `apca` for perceptual accuracy in dark mode and on chromatic backgrounds.
