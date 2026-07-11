# @studnicky/context

> Per-request async context isolation using AsyncLocalStorage

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/context)

Scoped key-value stores that propagate automatically through async boundaries — promises, timers, and callbacks — without passing values down the call stack.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/context
```

## Usage

```typescript
import { Context } from '@studnicky/context';

const requestContext = Context.create({ name: 'request' });

// Initialize a scope with optional seed values
const scope = requestContext.initialize({ requestId: 'req-001' });

// Execute within the scope — context is active only inside execute()
const result = await scope.execute(async () => {
  requestContext.set('statusCode', 200);

  // Read anywhere in the async chain
  const id = requestContext.get<string>('requestId');
  const code = requestContext.get<number>('statusCode');

  return { id, code };
});

// Extract final state and close the scope
const snapshot = scope.terminate();
// { requestId: 'req-001', statusCode: 200 }
```

## Extending

Context is designed for subclassing. Two commonly overridden extension points:

**1. Seed default values with `onInitialize`**

```typescript
import { Context, type ContextScope } from '@studnicky/context';

class RequestContext extends Context {
  protected override onInitialize(
    initial: Record<string, unknown> | undefined,
    scope: ContextScope
  ): void {
    // Always present in every scope, regardless of what caller passed
    scope.execute(() => {
      this.set('_startedAt', Date.now());
    });
  }
}

const ctx = RequestContext.create({ name: 'request' });
const scope = ctx.initialize({ requestId: 'req-001' });

scope.execute(() => {
  const startedAt = ctx.get<number>('_startedAt'); // seeded automatically
});
```

**2. Observe FSM transitions with `onEnter`**

```typescript
import { AsyncLocalStorage } from 'node:async_hooks';
import { ContextScope } from '@studnicky/context';

class TracedScope extends ContextScope {
  readonly transitions: Array<{ to: string; from: string }> = [];

  protected override onEnter(to: string, from: string): void {
    this.transitions.push({ to, from });
  }
}

const storage = new AsyncLocalStorage<Map<string, unknown>>();
const scope = TracedScope.create({ name: 'traced', storage });
```

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/context

## License

MIT
