# @studnicky/iridis

The engine. Composition spine + canonical models for the iridis chromatic pipeline. Zero runtime dependencies, browser- and Node-safe. Output adapters (CSS, Tailwind, VS Code, RDF, etc.) are separate plugins, none are required for the engine to run.

## What ships

- `Engine` with `TaskRegistry`
- Canonical pipeline tasks: `intake:* / clamp:* / resolve:roles / expand:family / enforce:contrast / derive:variant / emit:json`
- 25 math primitives (OKLCH ↔ RGB ↔ HSL ↔ Hex, sRGB ↔ linear ↔ Display-P3, gamut-mapping, mix/lighten/darken/saturate/desaturate/hueShift, WCAG 2.1 + APCA contrast, ΔE2000, `ensureContrast`, median-cut clustering, luminance, contrastText) — each exported as a class plus a singleton instance for direct import
- Models: `ColorRecord`, `PaletteState`, `RoleSchema`, `RuntimeOptions` (typed cross-output toggles)

## Install

```bash
npm install @studnicky/iridis
```

## Usage

```ts
import { Engine, coreTasks } from '@studnicky/iridis';

const engine = new Engine();
for (const task of coreTasks) engine.tasks.register(task);

engine.pipeline(['intake:any', 'resolve:roles', 'emit:json']);

const state = await engine.run({
  'colors':  ['#8B5CF6'],
  'roles':   yourRoleSchema,
  'runtime': { 'framing': 'dark' },
});

console.log(state.outputs['json']);
```

Math primitives are direct singleton imports — pull only what you call:

```ts
import { luminance, contrastWcag21, oklchToRgb } from '@studnicky/iridis';

const lum    = luminance.apply(record);
const ratio  = contrastWcag21.apply(foreground, background);
const purple = oklchToRgb.apply(0.62, 0.18, 290);
```

The Engine accepts plugins via `adopt()`, lets you register custom tasks, and orchestrates a declarative pipeline. `state.runtime` carries cross-output toggles (`framing`, `colorSpace`, plugin extras) read consistently by every emitter.

Part of [iridis](https://github.com/Studnicky/iridis).
