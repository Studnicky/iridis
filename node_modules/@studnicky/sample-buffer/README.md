# @studnicky/sample-buffer

> Fixed-capacity circular buffer for numeric samples with percentile calculation

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/sample-buffer)

A fixed-capacity sliding window of numeric samples. When the buffer reaches capacity, the oldest sample is automatically evicted to make room for the new one. Supports percentile calculation with linear interpolation and extensible lifecycle hooks.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/sample-buffer
```

## Usage

```typescript
import { SampleBuffer } from '@studnicky/sample-buffer';

const buffer = SampleBuffer.create({ capacity: 5 });

// Fill the buffer
buffer.push(10);
buffer.push(20);
buffer.push(30);
buffer.push(40);
buffer.push(50);

console.log(buffer.length);   // 5
console.log(buffer.isFull);   // true

// Push beyond capacity — oldest samples are evicted
buffer.push(60); // evicts 10
buffer.push(70); // evicts 20

console.log(buffer.length);   // 5 (capacity is fixed)

// Percentile calculation via linear interpolation
const median = buffer.percentile(50);   // number
const p95    = buffer.percentile(95);   // number

console.log(`p50: ${median}, p95: ${p95}`);

// Reset
buffer.clear();
console.log(buffer.length);  // 0
```

## Extending

Override the protected lifecycle hooks to observe buffer events without modifying the core logic:

```typescript
import { SampleBuffer } from '@studnicky/sample-buffer';

class TrackedBuffer extends SampleBuffer {
  readonly evicted: number[] = [];

  protected override onEvict(oldValue: number): void {
    this.evicted.push(oldValue);
  }

  protected override onPush(value: number, evicted: boolean): void {
    if (evicted) {
      console.log(`Pushed ${value}, evicted one sample`);
    }
  }
}

const tracked = TrackedBuffer.create({ capacity: 3 });
tracked.push(1);
tracked.push(2);
tracked.push(3);
tracked.push(4); // evicts 1

console.log(tracked.evicted); // [1]
```

Available hooks (all no-op by default):

| Hook | When it fires |
|---|---|
| `onEvict(oldValue: number)` | Before the oldest sample is overwritten (full-buffer path only) |
| `onPush(value: number, evicted: boolean)` | After push completes, after length/head are updated |
| `onClear()` | At the start of `clear()`, before state is reset |
| `onPercentile(pct: number, result: number)` | Before returning from `percentile()` |

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/sample-buffer

## License

MIT
