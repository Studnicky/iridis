# @studnicky/clock

> Wall-clock and monotonic time primitives with injectable providers for deterministic testing

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/clock)

`@studnicky/clock` provides a `Clock` class that delegates to a swappable `ClockProviderType`, returning epoch-ms from `.now()` and nanosecond timestamps from `.hrtime()` — both with per-instance monotonicity enforcement. Swap in `VirtualClockProvider` and `VirtualTimeCounter` for fully deterministic time control in tests.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/clock
```

## Usage

### Production — real wall-clock time

```ts
import { Clock, RealTimeClockProvider } from '@studnicky/clock';

const provider = RealTimeClockProvider.create();
const clock = Clock.create(provider);

const epochMs = clock.now();     // e.g. 1750000000000
const ns = clock.hrtime();       // e.g. 1234567890123456789n
```

Pass an optional `offsetMs` to `RealTimeClockProvider` for clock-skew correction:

```ts
// Shift all readings forward by 500 ms
const skewed = RealTimeClockProvider.create({ offsetMs: 500 });
const clock = Clock.create(skewed);
```

### Testing — deterministic virtual time

```ts
import { Clock, VirtualClockProvider, VirtualTimeCounter } from '@studnicky/clock';

const counter = VirtualTimeCounter.create();         // start at epoch-ms 0
const provider = VirtualClockProvider.create(counter);
const clock = Clock.create(provider);

console.log(clock.now());    // 0
counter.advance(1000);
console.log(clock.now());    // 1000
counter.advance(500);
console.log(clock.now());    // 1500
```

Multiple `Clock` instances can share one counter — all see advances immediately:

```ts
const counter = VirtualTimeCounter.create();
const clockA = Clock.create(VirtualClockProvider.create(counter));
const clockB = Clock.create(VirtualClockProvider.create(counter));

counter.advance(200);
console.log(clockA.now()); // 200
console.log(clockB.now()); // 200
```

### Fluent builder API

```ts
const clock = Clock.builder()
  .withProvider(RealTimeClockProvider.create())
  .build();

const skewed = RealTimeClockProvider.builder()
  .withOffsetMs(500)
  .build();

const counter = VirtualTimeCounter.builder()
  .withStartMs(1000)
  .build();

const provider = VirtualClockProvider.builder()
  .withCounter(counter)
  .build();
```

## Extending

`ClockProviderType` is the DI seam — implement it to inject any time source:

```ts
import type { ClockProviderType } from '@studnicky/clock';
import { Clock } from '@studnicky/clock';

class FixedClockProvider implements ClockProviderType {
  hrtime(): bigint { return 42_000_000n; }
  now(): number    { return 42; }
}

const clock = Clock.create(new FixedClockProvider());
console.log(clock.now());    // 42
console.log(clock.hrtime()); // 42000000n
```

`Clock` also exposes protected override seams — `readNow()` and `readHrtime()` — for subclasses that need to intercept or transform values before monotonicity clamping is applied.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/clock

## License

MIT
