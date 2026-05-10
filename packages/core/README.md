# @studnicky/iridis

The engine. Composition spine + canonical models for the iridis chromatic pipeline. Zero runtime dependencies, browser- and Node-safe. Output adapters (CSS, Tailwind, VS Code, RDF, etc.) are separate plugins, none are required for the engine to run.

## What ships

- `Engine` with `TaskRegistry` and `ColorMathRegistry`
- Canonical pipeline tasks: `intake:* / clamp:* / resolve:roles / expand:family / enforce:contrast / derive:variant / emit:json`
- 25 math primitives (OKLCH ↔ RGB ↔ HSL ↔ Hex, sRGB ↔ linear ↔ Display P3, mix/lighten/darken/saturate/desaturate/hueShift, WCAG 2.1 + APCA contrast, ΔE2000, ensureContrast, median-cut clustering, luminance, contrastText)
- Models: `ColorRecord`, `PaletteState`, `RoleSchema`, `RuntimeOptions` (typed cross-output toggles)

## Install

```bash
npm install @studnicky/iridis
```

## Usage

```ts
import { engine, mathBuiltins, coreTasks } from '@studnicky/iridis';

for (const m of mathBuiltins) engine.math.register(m);
for (const t of coreTasks)    engine.tasks.register(t);

engine.pipeline(['intake:any', 'resolve:roles', 'emit:json']);

const state = await engine.run({
  'colors':  ['#8B5CF6'],
  'roles':   yourRoleSchema,
  'runtime': { 'framing': 'dark' },
});

console.log(state.outputs['json']);
```

The Engine accepts plugins via `adopt()`, lets you register custom math primitives and tasks, and orchestrates a declarative pipeline. `state.runtime` carries cross-output toggles (`framing`, `colorSpace`, plugin extras) read consistently by every emitter.

Part of [iridis](https://github.com/Studnicky/iridis).
