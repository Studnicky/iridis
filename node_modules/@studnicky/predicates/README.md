# @studnicky/predicates

> Type guards, numeric checks, string bounds, array constraints, and coercion helpers aligned to JSON Schema draft 2020-12.

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/predicates)

A static predicate library that covers every primitive check needed for JSON Schema draft 2020-12 validation. All methods live on a single class — no instantiation required. Checks span type inference, string bounds (Unicode code-point aware), numeric constraints with epsilon tolerance, array uniqueness, object property rules, enum and const equality, coercion, and content encoding/media-type validation.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/predicates
```

## Usage

```typescript
import { Predicates } from '@studnicky/predicates';

// Type inference
Predicates.inferValueType(null);        // 'null'
Predicates.inferValueType([]);          // 'array'
Predicates.inferValueType({});          // 'object'
Predicates.isFiniteNumber(42);          // true
Predicates.isIntegerValue(3.14);        // false

// Type matching
Predicates.matchesType('integer', 5);              // true
Predicates.matchesAnyType(['string', 'null'], null); // true

// String bounds — Unicode code-point aware
Predicates.satisfiesMinLength('hello', 3);   // true
Predicates.satisfiesMaxLength('hi', 10);     // true
Predicates.satisfiesPattern('abc', /^a/);    // true
Predicates.codePointLength('👋');            // 1

// Numeric constraints
Predicates.checkMinimum(5, 5, false);        // true  (inclusive)
Predicates.checkMinimum(5, 5, true);         // false (exclusive)
Predicates.checkMaximum(10, 10, false);      // true
Predicates.checkMultipleOf(0.3, 0.1);        // true  (epsilon-tolerant)

// Array constraints
Predicates.checkMinItems([1, 2], 2);          // true
Predicates.checkMaxItems([1, 2, 3], 2);       // false
Predicates.checkUniqueItems([1, 2, 1]);       // false
Predicates.satisfiesContains(2, 1, 3);        // true  (matchCount within [min, max])

// Object constraints
Predicates.checkRequired({ a: 1 }, ['a', 'b']);            // false — 'b' missing
Predicates.hasNoAdditionalProperties({ a: 1 }, new Set(['a'])); // true
Predicates.satisfiesMinProperties({ a: 1 }, 2);            // false
Predicates.satisfiesMaxProperties({ a: 1, b: 2 }, 3);     // true

// Enum and const
Predicates.satisfiesEnum('red', ['red', 'green', 'blue']); // true
Predicates.satisfiesConst({ x: 1 }, { x: 1 });            // true (deep equal)

// Coercion
Predicates.coerceToBoolean('true');    // true
Predicates.coerceToBoolean('1');       // true
Predicates.coerceToBoolean('maybe');   // undefined
Predicates.coerceToNumber('3.14');     // 3.14
Predicates.coerceToNumber('NaN');      // undefined
Predicates.coerceValue(['integer', 'string'], '42'); // 42

// Content encoding and media type
Predicates.satisfiesContentEncoding('aGVsbG8=', 'base64');          // true
Predicates.satisfiesContentMediaType('{"x":1}', 'application/json'); // true
```

## License

MIT
