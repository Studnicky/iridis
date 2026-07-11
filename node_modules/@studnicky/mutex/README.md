# @studnicky/mutex

> Key-based async mutex for preventing race conditions in concurrent operations

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/mutex)

A fine-grained async mutex where operations on different keys run concurrently, while operations sharing the same key are serialized via an internal queue. Designed for entity resolution, cache population, and any scenario where concurrent writes to the same logical resource must be prevented.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/mutex
```

## Usage

```typescript
import { Mutex } from '@studnicky/mutex';

const mutex = Mutex.create<string>({ maxQueueSize: 100, timeout: 5000 });

// Different keys run concurrently — both complete without waiting for each other
const [a, b] = await Promise.all([
  mutex.runExclusive('user:1', async () => fetchUser('user:1')),
  mutex.runExclusive('user:2', async () => fetchUser('user:2')),
]);

// Same key serializes — the second call waits for the first to finish
let counter = 0;
await Promise.all([
  mutex.runExclusive('shared', async () => { counter++; }),
  mutex.runExclusive('shared', async () => { counter++; }),
]);
// counter === 2, increments happened one at a time
```

## Extending

Subclass `Mutex` and override any of the protected lifecycle hooks to add telemetry without coupling the base class to a metrics library. The hooks fire around every acquire and release cycle.

```typescript
import { Mutex } from '@studnicky/mutex';

class InstrumentedMutex extends Mutex<string> {
  protected override afterAcquire(key: string, waitTimeMs: number): void {
    metrics.histogram('mutex.wait_ms', waitTimeMs, { key });
  }

  protected override beforeRelease(key: string, holdTimeMs: number): void {
    metrics.histogram('mutex.hold_ms', holdTimeMs, { key });
  }
}

const mutex = new InstrumentedMutex({ timeout: 3000 });
await mutex.runExclusive('resource', () => doWork());
```

Available hooks: `beforeAcquire`, `afterAcquire`, `onContended`, `beforeRelease`, `afterRelease`, `onTimeout`.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/mutex

## License

MIT
