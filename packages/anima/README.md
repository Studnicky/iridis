# @studnicky/iridis-anima

Living-color animation engine. Evaluates a palette curve at a progress value
`t in [0, 1]`, shaping `t` through an easing function and interpolating every
role's OKLCH triple via `@studnicky/iridis-algebra`'s `lerp`. Optionally
re-validates declared contrast pairs on every evaluated frame, not just at
the curve's endpoints, by running `@studnicky/iridis-contrast`'s
`enforce:compliance` task.

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
npm install @studnicky/iridis @studnicky/iridis-anima
```

`@studnicky/iridis` is a peer dependency: `enforceContrast` (and therefore
`evaluateEnforced` / `evaluateStopsEnforced`) builds a pipeline state and runs
the `enforce:compliance` task from `@studnicky/iridis-contrast` directly.

## Usage

```ts
import type { PaletteEntity } from '@studnicky/iridis-algebra';

import { evaluate, cubicBezier } from '@studnicky/iridis-anima';

const day: PaletteEntity = {
  accent:     { l: 0.62, c: 0.18, h: 30 },
  background: { l: 0.95, c: 0.02, h: 30 },
};

const night: PaletteEntity = {
  accent:     { l: 0.72, c: 0.16, h: 210 },
  background: { l: 0.12, c: 0.02, h: 250 },
};

const dusk: PaletteEntity = {
  accent:     { l: 0.68, c: 0.20, h: 300 },
  background: { l: 0.30, c: 0.03, h: 280 },
};

const easeInOut = cubicBezier(0.42, 0, 0.58, 1);

export function frameAt(t: number): PaletteEntity {
  return evaluate(day, night, t, {
    chromaticDetourRoles: ['accent'],
    easing:               easeInOut,
  });
}
```

Multi-stop curves and contrast-enforced evaluation:

```ts
import { evaluateStops, evaluateStopsEnforced } from '@studnicky/iridis-anima';

// stops can hold any number of palette waypoints, not just two
const stops = [day, dusk, night];

const frame = evaluateStops(stops, 0.5);

const enforcedFrame = evaluateStopsEnforced(stops, 0.5, {
  chromaticDetourRoles: undefined,
  contrastPairs: [
    { algorithm: 'wcag21', background: 'background', foreground: 'accent', minRatio: 4.5 },
  ],
  easing:           undefined,
  enforcer:         undefined,
  hueInterpolation: undefined,
});
```

## Evaluation functions

| Function | Signature | Behaviour |
|---|---|---|
| `evaluate` | `(from, to, t, options?) => PaletteEntity` | Two-stop curve. Eases `t`, then delegates to `iridis-algebra`'s `lerp`. Roles named in `options.chromaticDetourRoles` route their hue through the chromatic detour path instead of the direct lerp. |
| `evaluateStops` | `(stops, t, options?) => PaletteEntity` | Multi-stop curve. Divides `[0, 1]` evenly across `stops.length - 1` segments, maps `t` onto its segment, and delegates to `evaluate` for that segment's local progress. |
| `evaluateEnforced` | `(from, to, t, options) => PaletteEntity` | `evaluate`, then re-validates `options.contrastPairs` against the resulting frame by running `options.enforcer` (default `enforce:compliance` from `@studnicky/iridis-contrast`). |
| `evaluateStopsEnforced` | `(stops, t, options) => PaletteEntity` | `evaluateStops`, then the same per-frame contrast re-validation as `evaluateEnforced`. |
| `enforceContrast` | `(palette, pairs, enforcer?) => PaletteEntity` | The re-validation step `evaluateEnforced`/`evaluateStopsEnforced` call internally, exported standalone for callers who evaluate a frame some other way and still want it contrast-checked. |

## Easings

| Easing | Signature | Notes |
|---|---|---|
| `linear` | `EasingFunctionType` | Identity: progress advances at a constant rate. |
| `cubicBezier` | `(p1x, p1y, p2x, p2y) => EasingFunctionType` | Standard CSS-style cubic-bezier curve, endpoints pinned to `(0,0)` and `(1,1)`, solved via Newton-Raphson. |
| `spring` | `(options?) => EasingFunctionType` | Damped-spring easing from 0 to 1. `options.stiffness` / `options.damping` / `options.mass` (defaults `170` / `26` / `1`); underdamped springs oscillate before settling, endpoints pinned exactly. |
| `chromaticDetourHue` | `(from, to, t, direction?) => number` | Hue-path composer for warm-to-cool role transitions. When the direct hue sweep would cross the dull brown/gray dead zone, the path routes through an intermediate green hue (120 degrees) instead of the direct sweep. |

`chromaticDetourHue` is what `evaluate`'s `chromaticDetourRoles` option invokes
per role; it is also exported standalone for callers composing custom curve
logic. Compare a naive RGB lerp against `chromaticDetourHue`'s OKLCH-plus-green
routing on a warm-to-cool transition and the muddy midpoint the naive path
produces disappears.

Part of [iridis](https://github.com/Studnicky/iridis).
