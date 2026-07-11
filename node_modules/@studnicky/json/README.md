# @studnicky/json

> JSON/object value-tools: deep merge, clone, equal, freeze, path access, sort, patch, hash

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/json)

A collection of pure-static utility classes for working with JSON-compatible values in TypeScript. Every class is V8-monomorphic, free of side effects, and safe to use in hot paths.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/json
```

## Usage

```ts
import { Clone, DataType, Frozen, Hash, Merge, Patch, Path, Sort, StructuralHash } from '@studnicky/json';

// --- Merge ---
const base = { a: 1, b: { x: 10, y: 20 } };
const overlay = { b: { y: 99, z: 3 }, c: 'new' };
const merged = Merge.deep(base, overlay);
// { a: 1, b: { x: 10, y: 99, z: 3 }, c: 'new' }
// Arrays are replaced atomically; override mergeArrays to concat.

// --- Clone ---
const original = { items: [1, 2, 3], created: new Date() };
const copy = Clone.deep(original);
// copy !== original, copy.items !== original.items
const shallow = Clone.shallow({ a: 1, b: 2 });

// --- Path ---
const access = Path.toAccess('/items/0/name');
// 'items[0].name'

const obj = { user: { address: { city: 'Melbourne' } } };
const city = Path.get(obj, 'user.address.city');
// 'Melbourne'

// --- Sort ---
['file10', 'file2', 'file1'].sort(Sort.natural);
// ['file1', 'file2', 'file10']

['id', 'type', 'description'].sort(Sort.longestFirst);
// ['description', 'type', 'id']

['description', 'id', 'type'].sort(Sort.shortestFirst);
// ['id', 'type', 'description']

// --- Hash ---
const h = Hash.value({ b: 2, a: 1 });
// deterministic 8-char hex; key order normalised

// --- StructuralHash ---
const schemaHash = StructuralHash.of({ type: 'string', title: 'ignored', description: 'also ignored' });
// Same hash as StructuralHash.of({ type: 'string' })

// --- DataType ---
DataType.deepEqual({ a: [1, 2] }, { a: [1, 2] }); // true
DataType.isPlainObject({});                          // true
DataType.isRecord([]);                               // false
DataType.hasCycle({});                               // false

// --- Frozen ---
const frozen = Frozen.deepFreeze({ nested: { value: 42 } });
// Object.isFrozen(frozen) === true

// --- Patch (instance-based, RFC-6902) ---
const doc = { status: 'draft', count: 0 };
const patch = Patch.create([
  { op: 'replace', path: '/status', value: 'published' },
  { op: 'add', path: '/count', value: 1 },
]);
patch.apply(doc);
// doc === { status: 'published', count: 1 }

// Or use static factories:
Patch.replace('/status', 'published').apply(doc);
```

## Extending

All classes are pure-static (except `Patch`, which is instance-based). Each exposes `protected static` steps you can override in a subclass.

```ts
import { Merge } from '@studnicky/json';

// Concat arrays instead of replacing them
class ConcatMerge extends Merge {
  protected static override mergeArrays(base: unknown[], overlay: unknown[]): unknown[] {
    return [...base, ...overlay];
  }
}

const result = ConcatMerge.deep({ tags: ['a'] }, { tags: ['b'] });
// { tags: ['a', 'b'] }
```

Other useful overrides:

```ts
import { Hash } from '@studnicky/json';

// Include a custom salt in every hash
class SaltedHash extends Hash {
  protected static override hashValue(value: unknown): string {
    return `salt:${super.hashValue(value)}`;
  }
}

import { Frozen } from '@studnicky/json';

// Skip freezing class instances
class SelectiveFrozen extends Frozen {
  protected static override shouldFreeze(value: object): boolean {
    return Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null;
  }
}
```

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/json

## License

MIT
