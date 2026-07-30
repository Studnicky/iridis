# @studnicky/iridis-pulse

Time and value binding primitives. Maps an external signal, real time,
virtual (deterministic) time, or an arbitrary scalar such as scroll position
or a sensor reading, onto the normalized progress value `t in [0, 1]` that
`@studnicky/iridis-anima`'s `evaluate` and `@studnicky/iridis-fsm`'s
`PaletteStateMachine.tick()` consume. The engine's curve evaluation never
needs to know where `t` comes from; `iridis-pulse` is where that decision
lives.

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
npm install @studnicky/iridis-pulse
```

## Usage

### ClockBinding

Drives `t` from elapsed time, either a real clock (`Date.now()`) or a
deterministic virtual stepper for tests and reproducible playback.

```ts
import type { PaletteInterfaceType } from '@studnicky/iridis-algebra';

import { ClockBinding } from '@studnicky/iridis-pulse';
import { evaluate } from '@studnicky/iridis-anima';

declare const day: PaletteInterfaceType;
declare const night: PaletteInterfaceType;

const clock = ClockBinding.create({ durationMs: 2000, mode: 'real' });

function renderFrame() {
  const palette = evaluate(day, night, clock.t);
  // apply palette to your document
  requestAnimationFrame(renderFrame);
}
```

In `'virtual'` mode, `t` only moves when you call `advance()` -- useful for
tests and for driving playback off something other than a real clock:

```ts
const virtualClock = ClockBinding.create({ durationMs: 1000, mode: 'virtual' });
virtualClock.advance(250); // virtualClock.t === 0.25
virtualClock.advance(750); // virtualClock.t === 1
```

### ValueBinding

Maps a raw scalar into `[0, 1]`, clamped by default.

```ts
import { ValueBinding } from '@studnicky/iridis-pulse';

const scrollBinding = ValueBinding.create({ clamp: true, max: 2000, min: 0 });

window.addEventListener('scroll', () => {
  const t = scrollBinding.mapToT(window.scrollY);
  const palette = evaluate(day, night, t);
  // apply palette to your document
});
```

## API

| Export | Kind | Notes |
|---|---|---|
| `ClockBinding` | class | `ClockBinding.create({ durationMs, mode })` where `mode` is `'real'` or `'virtual'`. `.t` reads current progress; `.advance(deltaMs)` moves virtual-mode time forward manually (real-mode providers ignore it). |
| `ValueBinding` | class | `ValueBinding.create({ max, min, clamp? })`, `clamp` defaults to `true`. `.mapToT(value)` linearly maps `value` from `[min, max]` onto `[0, 1]`, clamping when `clamp` is `true`. |

`SignalBindingInterfaceType` is the shared shape (a `t` getter) both bindings
implement, exported as a type for callers writing their own signal source.
`ClockBindingOptionsInterfaceType` and `ValueBindingOptionsInterfaceType` are
also exported for typing the options object passed to each `.create()` call.

Part of [iridis](https://github.com/Studnicky/iridis).
