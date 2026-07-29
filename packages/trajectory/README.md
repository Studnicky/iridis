# @studnicky/iridis-trajectory

A curated library of named palette trajectories: multi-stop curves through
OKLCH x N-roles space, registered under a string name and resolved at any
progress value `t` via `@studnicky/iridis-anima`'s `evaluateStops`. Ships
three built-in trajectories and a registry for adding your own.

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
npm install @studnicky/iridis-trajectory
```

## Usage

```ts
import { TrajectoryRegistry } from '@studnicky/iridis-trajectory';

const registry = new TrajectoryRegistry();

const palette = registry.resolve('sunrise', 0.5);
```

The registry seeds itself with the built-in set on construction; register
additional named trajectories alongside them:

```ts
import type { PaletteInterfaceType } from '@studnicky/iridis-algebra';
import type { TrajectoryDefinitionInterfaceType } from '@studnicky/iridis-trajectory';

import { TrajectoryRegistry } from '@studnicky/iridis-trajectory';

declare const quietPalette: PaletteInterfaceType;
declare const activePalette: PaletteInterfaceType;

const registry = new TrajectoryRegistry();

const brandPulse: TrajectoryDefinitionInterfaceType = {
  opts: { chromaticDetourRoles: undefined, easing: undefined, hueDirection: 'shortestArc' },
  stops: [quietPalette, activePalette, quietPalette],
};

registry.registerTrajectory('brand-pulse', brandPulse);
const frame = registry.resolve('brand-pulse', 0.75);
```

Built-in trajectories are also importable directly, for use with
`evaluateStops` outside a registry:

```ts
import { sunriseTrajectory } from '@studnicky/iridis-trajectory';
import { evaluateStops } from '@studnicky/iridis-anima';

const frame = evaluateStops(sunriseTrajectory.stops, 0.3, sunriseTrajectory.opts);
```

## Built-in trajectories

| Registry name | Export | Sweep |
|---|---|---|
| `sunrise` | `sunriseTrajectory` | Warm-to-cool sweep from deep dawn orange through green to a pale sky-blue morning. Four stops, `hueDirection: 'clockwise'`. |
| `dusk-fade` | `duskFadeTrajectory` | Cool sweep from a lit dusk sky down through violet into near-black night. |
| `focus-pulse` | `focusPulseTrajectory` | A short back-and-forth pulse on the accent role that returns near its starting point. |

## API

| Export | Kind | Notes |
|---|---|---|
| `TrajectoryRegistry` | class | `registerTrajectory(name, definition)` adds or overwrites an entry; `resolve(name, t)` evaluates the named trajectory's stops at `t` via `evaluateStops`, throwing on an unknown name. Constructed with the built-in set already registered. |
| `sunriseTrajectory` / `duskFadeTrajectory` / `focusPulseTrajectory` | `TrajectoryDefinitionInterfaceType` | The built-in definitions, each `{ opts, stops }` -- importable standalone without going through the registry. |
| `TrajectoryDefinitionInterfaceType` | type | `{ opts: CurveOptionsInterfaceType \| undefined; stops: PaletteInterfaceType[] }` -- the shape every registered trajectory (built-in or custom) must satisfy. |

Part of [iridis](https://github.com/Studnicky/iridis).
