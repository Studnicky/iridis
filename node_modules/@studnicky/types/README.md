# @studnicky/types

> Shared zero-runtime utility types and type-guard helpers for @studnicky/substrate

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/types)

`@studnicky/types` provides compile-time utility types (`JsonValue`, `DeepReadonly`, `DeepMergeType`, `JsonSchema`) and the `Wire` pure-static class for safely narrowing `unknown` wire-format values — with zero runtime overhead for the types and a minimal footprint for the guards.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/types
```

## Usage

### Runtime guards (`Wire`)

`Wire` narrows `unknown` values returned from external APIs, JSON payloads, or any dynamically-typed source:

```typescript
import { Wire } from '@studnicky/types';

const raw: unknown = await fetchApiResponse();

// Narrow to Record<string, unknown>
const record = Wire.asRecord(raw);
if (record !== undefined) {
  const name = Wire.asString(record['name']);     // string | undefined
  const age  = Wire.asNumber(record['age']);      // number | undefined
  const note = Wire.asStringOrNull(record['note']); // string | null | undefined
}

// Type guard form
if (Wire.isRecord(raw)) {
  // raw is Record<string, unknown> here
}

// Narrowing arrays of records (non-record elements are filtered out)
const items = Wire.asRecordArray(raw);
// items is Record<string, unknown>[] | undefined
```

### Compile-time types

These are type annotations only — no runtime overhead:

```typescript
import type { JsonValue, JsonObject, DeepReadonly, DeepMergeType } from '@studnicky/types';
import type { JsonSchema, JsonSchemaObject, JsonSchemaTypeName } from '@studnicky/types';

// Recursive readonly JSON-safe value
const value: JsonValue = { nested: [1, 'two', null] };

// Unvalidated JSON object
const payload: JsonObject = JSON.parse(responseText) as JsonObject;

// Recursive readonly wrapper
type Config = DeepReadonly<{ host: string; ports: number[] }>;

// Type-level deep merge
type Merged = DeepMergeType<{ a: string; b: number }, { b: string; c: boolean }>;
// → { a: string; b: string; c: boolean }

// JSON Schema 2020-12 types
const schema: JsonSchemaObject = { type: 'string', minLength: 1 };
const typeName: JsonSchemaTypeName = 'string'; // 'string' | 'number' | 'integer' | 'boolean' | 'null' | 'array' | 'object'
```

## Extending

All types are pure compile-time constructs — import and annotate, nothing more.

For `Wire`, override the static `isRecord` predicate in a subclass to customise record detection. Because `asRecord` and `asRecordArray` delegate through `this.isRecord`, overrides propagate automatically:

```typescript
import { Wire } from '@studnicky/types';

class StrictWire extends Wire {
  public static override isRecord(value: unknown): value is Record<string, unknown> {
    return super.isRecord(value) && !Array.isArray(value);
  }
}

// StrictWire.asRecord and StrictWire.asRecordArray use the overridden predicate
const result = StrictWire.asRecord(payload);
```

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/types

## License

MIT
