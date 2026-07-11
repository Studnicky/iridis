# @studnicky/scheduler

> Scheduler primitives — real-time (setTimeout/setInterval) and virtual (min-heap, deterministic) implementations

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/scheduler)

`@studnicky/scheduler` provides two scheduler implementations behind a common `SchedulerProviderInterface`: `RealTimeScheduler` for production use and `VirtualScheduler` for deterministic, time-controlled testing without real timers.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/scheduler
```

## Usage

### Virtual scheduler (testing)

```ts
import { VirtualScheduler } from '@studnicky/scheduler';
import { VirtualTimeCounter } from '@studnicky/clock';

const counter = VirtualTimeCounter.create({ startMs: 0 });
const scheduler = VirtualScheduler.create({ counter });

const fired: number[] = [];

scheduler.scheduleAt(100, () => { fired.push(100); });
scheduler.scheduleAt(200, () => { fired.push(200); });

scheduler.advance(150);
// fired → [100]

scheduler.advance(100);
// fired → [100, 200]
```

Pass the same `VirtualTimeCounter` instance to `VirtualClockProvider` when you need `Clock.now()` to stay in sync with scheduled task fires.

### Real-time scheduler (production)

```ts
import { RealTimeScheduler } from '@studnicky/scheduler';

const scheduler = RealTimeScheduler.create();

const task = scheduler.scheduleAt(Date.now() + 1000, () => {
  console.log('fired after 1 s');
});

// Cancel before it fires:
task.cancel();

// Or cancel everything:
scheduler.cancelAll();
```

## Extending

Inject either implementation via `SchedulerProviderInterface` so production and test code share the same call site:

```ts
import type { SchedulerProviderInterface } from '@studnicky/scheduler';

class TaskRunner {
  readonly #scheduler: SchedulerProviderInterface;

  public constructor(scheduler: SchedulerProviderInterface) {
    this.#scheduler = scheduler;
  }

  public enqueue(atMs: number, work: () => void): void {
    this.#scheduler.scheduleAt(atMs, work);
  }
}
```

Both classes expose protected extension seams for subclassing:

- `generateId()` — control task ID format.
- `createHeap()` (`VirtualScheduler`) / `createTimeout()`, `createInterval()`, `clearTimer()` (`RealTimeScheduler`) — substitute the underlying timer or heap backend.
- Lifecycle hooks: `onSchedule`, `onFire`, `onCancel`, `onCancelAll` (plus `onAdvance`, `onRunUntil` on `VirtualScheduler`) — attach observability without touching core logic.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/scheduler

## License

MIT
