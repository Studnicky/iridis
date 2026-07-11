# @studnicky/concurrency

> Keyed async channels, counting semaphores, concurrent-call coalescing, and async iterable combinators.

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/concurrency)

`@studnicky/concurrency` provides four building blocks for async coordination in Node.js. `Channel` is a string-keyed fan-in inbox where producers publish items and consumers iterate them as async generators. `Semaphore` is a counting permit gate that bounds how many concurrent operations run at once. `Coalesce` deduplicates concurrent calls by key so that a shared factory runs exactly once per in-flight batch. `AsyncIter` supplies static combinators — `merge`, `filter`, and `enrich` — for composing async iterables.

All primitives are TypeScript-native, ESM-only, and carry no runtime dependencies.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/concurrency
```

## Usage

```typescript
import { AsyncIter, Channel, Coalesce, Semaphore } from '@studnicky/concurrency';

// Channel — keyed producer / consumer
const channel = Channel.create<string>();
channel.publish('events', 'hello');
channel.publish('events', 'world');
channel.close();
const received: string[] = [];
for await (const msg of channel.subscribe('events')) {
  received.push(msg);
}
// received === ['hello', 'world']

// Semaphore — bound concurrency
const sem = Semaphore.create({ permits: 2 });
const result = await sem.withPermit(async () => {
  // at most 2 callers reach here simultaneously
  return fetch('https://api.example.com/data');
});
console.log(sem.available); // 2 — permit returned

// Coalesce — deduplicate concurrent calls
const coalesce = Coalesce.create<Response>();
const [a, b] = await Promise.all([
  coalesce.run('user:42', () => fetch('/api/user/42')),
  coalesce.run('user:42', () => fetch('/api/user/42')), // shares the first fetch
]);
// factory called once; both callers receive the same resolved value

// AsyncIter — composable async iterables
async function* nums(start: number, end: number): AsyncGenerator<number> {
  for (let i = start; i <= end; i++) { yield i; }
}

const merged = AsyncIter.merge(nums(1, 3), nums(10, 12));
const evens = AsyncIter.filter(merged, (n) => n % 2 === 0);
const enriched = AsyncIter.enrich(
  evens,
  async (n) => n > 5 ? { label: 'high' } : null,
  (n, e) => ({ n, ...e }),
);
for await (const item of enriched) {
  console.log(item); // 2, { n: 10, label: 'high' }, { n: 12, label: 'high' }
}
```

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/concurrency

## License

MIT
