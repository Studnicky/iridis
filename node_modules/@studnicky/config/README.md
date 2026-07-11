# @studnicky/config

> Configuration validation utilities and type guards

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/config)

`@studnicky/config` provides pure-static assertion classes and type predicates for validating configuration objects at runtime. All assertions skip `undefined`/`null` values and throw `ConfigurationError` on failure, making them safe to compose for partial or fully optional config shapes.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/config
```

## Usage

```typescript
import {
  ConfigValidation,
  ConfigurationError,
  TypeGuards,
} from '@studnicky/config';

interface ServerConfig {
  host: string;
  port: number;
  debug: boolean;
}

const KNOWN_KEYS = new Set<string>(['host', 'port', 'debug']);

function validateServerConfig(raw: Record<string, unknown>): ServerConfig {
  // Reject unknown keys first
  ConfigValidation.assertNoUnknownKeys(raw, KNOWN_KEYS);

  // Assert types — each call is a no-op when the value is undefined/null
  ConfigValidation.assertString(raw['host'], 'host');
  ConfigValidation.assertNumber(raw['port'], 'port');
  ConfigValidation.assertBoolean(raw['debug'], 'debug');

  return raw as unknown as ServerConfig;
}

// Valid input — passes silently
const config = validateServerConfig({ host: 'localhost', port: 3000, debug: false });

// Invalid input — throws ConfigurationError
try {
  validateServerConfig({ host: 42, port: 3000, debug: false });
} catch (err) {
  if (err instanceof ConfigurationError) {
    console.error(err.message); // "host must be a string"
    console.error(err.code);    // "config.invalid"
  }
}

// Type guards for conditional branching
const raw: unknown = process.env['WORKER_COUNT'];
if (TypeGuards.isPositiveInteger(Number(raw))) {
  console.log('Worker count:', raw);
}

const maybeOptions: unknown = {};
if (TypeGuards.isObject(maybeOptions)) {
  // narrowed to Record<string, unknown>
  console.log('Options keys:', Object.keys(maybeOptions));
}
```

## Extending

`ConfigValidation` is a pure-static class. Override the protected `onValidationError` static method to throw a domain-specific error type instead of `ConfigurationError`:

```typescript
import { ConfigValidation } from '@studnicky/config';

class AppConfigValidation extends ConfigValidation {
  protected static override onValidationError(message: string): never {
    throw new Error(`[app] ${message}`);
  }
}

// Now all assertions throw your custom error
try {
  AppConfigValidation.assertString(123, 'apiKey');
} catch (err) {
  console.error((err as Error).message); // "[app] apiKey must be a string"
}
```

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/config

## License

MIT
