# @studnicky/iridis-algebra

Pure vector-math operations over palettes treated as points in OKLCH x N-roles
space. A palette of N roles is a vector of length 3N:

```
[L1, C1, h1,  L2, C2, h2,  ...,  Ln, Cn, hn]
```

Treating a palette this way makes a small algebra fall out for free: lerp
between two palettes, subtract one from another, find the nearest preset in a
corpus, detect drift past a tolerance, or nudge a single role's chroma
orthogonally. This package has no dependency on `@studnicky/iridis` or its
engine; it operates purely on `PaletteInterfaceType` values (`Record<string,
{ l, c, h }>`) and can be used standalone.

This is the foundation package for iridis's living-color stack.
`@studnicky/iridis-anima` builds curve evaluation on top of it,
`@studnicky/iridis-fsm` and `@studnicky/iridis-trajectory` build state
machines and named trajectories on top of that.

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
npm install @studnicky/iridis-algebra
```

## Usage

```ts
import type { PaletteInterfaceType } from '@studnicky/iridis-algebra';

import { lerp, subtract, nearest, drift, perpendicular } from '@studnicky/iridis-algebra';

const day: PaletteInterfaceType = {
  accent:     { l: 0.62, c: 0.18, h: 290 },
  background: { l: 0.98, c: 0.01, h: 290 },
};

const night: PaletteInterfaceType = {
  accent:     { l: 0.72, c: 0.20, h: 300 },
  background: { l: 0.12, c: 0.02, h: 290 },
};

const dusk = lerp(day, night, 0.4);
const delta = subtract(night, day);
const closest = nearest(dusk, [day, night]);
const shouldRederive = drift(day, dusk, 0.15);
const punchier = perpendicular(day, 'accent', 0.05);
```

## Operations

| Function | Signature | Meaning |
|---|---|---|
| `lerp` | `(a, b, t, options?) => PaletteInterfaceType` | Per-role OKLCH lerp between two palettes; hue wraps around the 0/360 circle per `options.hueDirection` (`shortestArc` default, `clockwise`, `counterClockwise`). |
| `subtract` | `(a, b) => PaletteInterfaceType` | Per-role OKLCH delta (`a - b`); hue delta wraps to `[-180, 180]`. |
| `nearest` | `(target, corpus, metric?) => PaletteInterfaceType` | Returns whichever palette in `corpus` is closest to `target` under `metric` (defaults to a perceptual OKLCH distance). Throws on an empty corpus. |
| `drift` | `(current, derived, threshold) => boolean` | `true` when the perceptual distance between `current` and `derived` exceeds `threshold` -- signals a re-derivation is due. |
| `perpendicular` | `(a, roleAxis, delta?) => PaletteInterfaceType` | Moves orthogonally on the chroma plane for `roleAxis`: `l` and `h` for that role hold fixed while `c` shifts by `delta` (clamped to `[0, 0.5]`). Other roles pass through unchanged. |
| `lerpHue` | `(from, to, t, direction?) => number` | The single-hue lerp `lerp` uses internally, exported standalone for callers composing their own per-channel interpolation. |

`nearest`'s default metric sums, over shared roles, `sqrt(dl^2 + dc^2 + dh^2)`
where `dh` is the wrapped hue delta scaled by `1/180` so a full half-circle hue
swing contributes the same magnitude as a full lightness or chroma swing. Pass
a custom `PaletteDistanceMetricType` to use a different perceptual weighting.

Part of [iridis](https://github.com/Studnicky/iridis).
