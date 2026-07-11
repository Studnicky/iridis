# @studnicky/circular-buffer

> Generic ring buffer with O(1) push and shift operations

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/circular-buffer)

A fixed-capacity ring buffer for TypeScript. When the buffer is full, the oldest item is evicted to make room for the new one (overflow: `'overwrite'`, the default). Opt in to unbounded growth with `overflow: 'grow'`.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/circular-buffer
```

## Usage

```ts
import { CircularBuffer } from '@studnicky/circular-buffer';

// Fixed-capacity ring: capacity 3, oldest item evicted when full
const buf = CircularBuffer.create<number>({ capacity: 3 });

buf.push(1);
buf.push(2);
buf.push(3);
buf.push(4); // 1 is evicted; ring holds [2, 3, 4]

console.log(buf.length); // 3

// Shift items in FIFO order — oldest surviving item first
console.log(buf.shift()); // 2
console.log(buf.shift()); // 3
console.log(buf.shift()); // 4
console.log(buf.shift()); // undefined — empty buffer returns undefined

console.log(buf.length); // 0
```

### Builder API

Use the fluent builder to configure before creating:

```ts
const buf = CircularBuffer.builder<number>()
  .withCapacity(16)
  .withOverflow('grow')
  .build();
```

### Grow mode (opt-in)

Pass `overflow: 'grow'` to preserve every item — the buffer doubles capacity instead of evicting:

```ts
const buf = CircularBuffer.create<number>({ capacity: 3, overflow: 'grow' });

buf.push(1);
buf.push(2);
buf.push(3);
buf.push(4); // capacity doubles to 6; all 4 items are retained

console.log(buf.length); // 4
```

## Extending

Override the protected lifecycle hooks to observe buffer events without modifying core behavior:

```ts
import { CircularBuffer } from '@studnicky/circular-buffer';

class InstrumentedBuffer<T> extends CircularBuffer<T> {
  readonly evictedItems: T[] = [];
  readonly growEvents: number[] = [];

  protected override onEvict(item: T): void {
    this.evictedItems.push(item);
    console.log('Evicted:', item);
  }

  protected override onGrow(oldCapacity: number, newCapacity: number): void {
    this.growEvents.push(newCapacity);
    console.log(`Buffer grew: ${oldCapacity} → ${newCapacity}`);
  }

  protected override onPush(item: T): void {
    console.log('Pushed:', item);
  }

  protected override onShift(item: T): void {
    console.log('Shifted:', item);
  }
}

const buf = InstrumentedBuffer.create<string>({ capacity: 2 });
buf.push('a');
buf.push('b');
buf.push('c'); // triggers onEvict('a') and onPush('c')

console.log(buf.evictedItems); // ['a']
```

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/circular-buffer

## License

MIT
