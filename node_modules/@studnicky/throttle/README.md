# @studnicky/throttle

> Generic async operation throttle with sliding window concurrency control

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/throttle)

Throttle concurrent async operations to a configurable limit. As each operation completes, the next queued operation starts immediately — no polling, no intervals. Supports graceful drain, immediate abort with detach-and-abandon semantics, and optional adaptive concurrency based on observed latency.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/throttle
```

## Usage

```typescript
import { Throttle } from '@studnicky/throttle';

const throttle = new Throttle({ concurrencyLimit: 5 });

const urls = ['https://api.example.com/a', 'https://api.example.com/b'];

const results = await Promise.all(
  urls.map((url) => throttle.execute(async () => fetch(url).then((r) => r.json())))
);

const stats = throttle.getStats();
console.log(`Executed: ${stats.totalExecuted}, active: ${stats.activeCount}`);
```

## Extending

Subclass `Throttle` and override any of the protected lifecycle hooks to add telemetry, logging, or custom behaviour without touching the core scheduling logic.

```typescript
import { Throttle } from '@studnicky/throttle';

class InstrumentedThrottle extends Throttle {
  readonly acquireLog: Array<{ activeCount: number; queuedCount: number }> = [];
  readonly releaseLog: Array<{ activeCount: number; totalExecuted: number }> = [];

  protected override onAcquire(activeCount: number, queuedCount: number): void {
    this.acquireLog.push({ activeCount, queuedCount });
  }

  protected override onRelease(activeCount: number, totalExecuted: number): void {
    this.releaseLog.push({ activeCount, totalExecuted });
  }
}

const throttle = new InstrumentedThrottle({ concurrencyLimit: 3 });
await throttle.execute(async () => 'done');

console.log('Acquired:', throttle.acquireLog);
console.log('Released:', throttle.releaseLog);
```

Other available hooks: `onDrainStart`, `onAbortStart`, `onAdaptiveAdjust`, `onReject`, and `onEnter` (FSM state transitions).

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/throttle

## License

MIT
