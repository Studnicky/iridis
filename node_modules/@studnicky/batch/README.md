# @studnicky/batch

> Batch concurrent execution for processing items in controlled batches

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/batch)

Process arrays of items in parallel batches using async generators. Each batch completes before the next begins, giving you streaming results and natural backpressure without external dependencies.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/batch
```

## Usage

```typescript
import { batchConcurrent } from '@studnicky/batch';

const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Process up to 3 items at a time; yields results batch by batch
for await (const batchResults of batchConcurrent.process(ids, async (id) => fetchUser(id), 3)) {
  console.log('Batch complete:', batchResults);
}

// Collect all results
const all: number[] = [];
for await (const batch of batchConcurrent.process(ids, async (id) => id * 2, { maxConcurrent: 5 })) {
  all.push(...batch);
}
```

## Extending

Since `batchConcurrent` is a utility namespace (not a class), extension means injecting a custom worker function (the `operation` parameter). Define a typed mapper and pass it in:

```typescript
import { batchConcurrent } from '@studnicky/batch';

const enrichItem = async (id: number): Promise<{ id: number; label: string }> => {
  return { id, label: `item-${id}` };
};

for await (const batch of batchConcurrent.process([1, 2, 3], enrichItem, 2)) {
  console.log(batch);
}
```

The `operation` parameter is the extension seam — swap in any async function that matches `(item: T) => Promise<TResult>`.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/batch

## License

MIT
