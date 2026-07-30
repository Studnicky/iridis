# @studnicky/iridis

The engine. Composition spine + canonical models for the iridis chromatic pipeline. Browser- and Node-safe. Output adapters (CSS, Tailwind, VS Code, RDF, etc.) are separate plugins, none are required for the engine to run.

## What ships

- `Engine` with `TaskRegistry`
- Canonical pipeline tasks: `intake:* / clamp:* / resolve:roles / expand:family / enforce:contrast / derive:variant / emit:json`
- 33 math primitives (OKLCH ↔ RGB ↔ HSL ↔ Hex, sRGB ↔ linear ↔ Display-P3, gamut-mapping, mix/lighten/darken/saturate/desaturate/hueShift, WCAG 2.1 + APCA contrast, ΔE2000, `ensureContrast`, median-cut clustering, luminance, contrastText), each exported as a class plus a singleton instance for direct import
- Models: `ColorRecord`, `PaletteState`, `RoleSchema`, `RuntimeOptions` (typed cross-output toggles)

## Install

GitHub Packages requires a personal access token (classic) with
`read:packages`; the token's account must also have read access to this
package's repository. Expose the token as `NODE_AUTH_TOKEN`, then configure
the `@studnicky` scope before installing:

```ini
# ~/.npmrc
@studnicky:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```bash
npm install @studnicky/iridis
```

## Usage

```ts
import type { RoleSchemaInterfaceType } from '@studnicky/iridis';

import { Engine, coreTasks } from '@studnicky/iridis';

export function generatePalette(roleSchema: RoleSchemaInterfaceType) {
  const engine = new Engine();
  for (const task of coreTasks) engine.tasks.register(task);

  engine.pipeline(['intake:any', 'resolve:roles', 'emit:json']);

  const state = engine.run({
    'bypass':    undefined,
    'colors':    ['#8B5CF6'],
    'contrast':  undefined,
    'emit':      undefined,
    'maxColors': undefined,
    'metadata':  undefined,
    'roles':     roleSchema,
    'runtime':   {
      'colorSpace': undefined,
      'extra':      undefined,
      'framing':    'dark',
    },
  });

  return state.outputs['core:json'];
}
```

Math primitives are direct singleton imports; pull only what you call:

```ts
import type { ColorRecordInterfaceType } from '@studnicky/iridis';

import { luminance, contrastWcag21, oklchToRgb } from '@studnicky/iridis';

export function inspectColors(
  record: ColorRecordInterfaceType,
  foreground: ColorRecordInterfaceType,
  background: ColorRecordInterfaceType,
) {
  const lum    = luminance.apply(record);
  const ratio  = contrastWcag21.apply(foreground, background);
  const purple = oklchToRgb.apply(0.62, 0.18, 290);

  return { lum, purple, ratio };
}
```

The Engine accepts plugins via `adopt()`, lets you register custom tasks, and orchestrates a declarative pipeline. `state.runtime` carries cross-output toggles (`framing`, `colorSpace`, plugin extras) read consistently by every emitter.

Part of [iridis](https://github.com/Studnicky/iridis).
