# @studnicky/errors

> Standardized error handling for all modules

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/errors)

`@studnicky/errors` provides a typed error hierarchy rooted at `BaseError`. Every error carries a machine-readable `code`, a `timestamp`, structured `metadata`, and a serializable cause chain. `ModuleError` adds scenario-based defaults, HTTP status codes, and context dictionaries. Subclassing is the primary extension point.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/errors
```

## Usage

```typescript
import { ModuleError, ErrorDefaults } from '@studnicky/errors';

// Quick error with scenario defaults
const err = ModuleError.create('User not found', {
  scenario: 'NOT_FOUND',
  context: { userId: 'u-123' }
});

console.log(err.code);       // 'NOT_FOUND'
console.log(err.statusCode); // 404
console.log(err.retryable);  // false

// Serialized for structured logging
const json = err.toJSON();
// { code, message, name, retryable, stack, context, ... }
```

## Extending

Subclass `ModuleError` to define domain-specific error classes with fixed defaults:

```typescript
import { ModuleError } from '@studnicky/errors';
import type { ModuleErrorOptionsInterface } from '@studnicky/errors';

export class DatabaseError extends ModuleError {
  static override create(
    message: string,
    options?: { cause?: Error; context?: Record<string, unknown> }
  ): DatabaseError {
    return new DatabaseError(message, {
      code: 'DATABASE_ERROR',
      cause: options?.cause,
      context: options?.context,
      retryable: false,
      statusCode: 500
    });
  }

  protected override serializeExtra(): Record<string, unknown> {
    return { domain: 'database' };
  }
}

const err = DatabaseError.create('Query timeout', { context: { query: 'SELECT...' } });
console.log(err.name);    // 'DatabaseError'
console.log(err.code);    // 'DATABASE_ERROR'
```

Override `formatUserMessage()` to provide user-safe messages distinct from internal error messages.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/errors

## License

MIT
