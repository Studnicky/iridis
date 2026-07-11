# @studnicky/retry

> Generic async retry utility with extensible error classification

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/retry)

A protocol-agnostic async retry engine with a configurable interceptor pipeline, pluggable error classification, and protected lifecycle hooks for zero-cost observability via subclassing.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/retry
```

## Usage

```typescript
import { Retry, DefaultHttpErrorClassifier } from '@studnicky/retry';

const retry = Retry.builder()
  .maxRetries(3)
  .errorClassifier(new DefaultHttpErrorClassifier())
  .retryInterceptor((ctx) => ({ delayMs: 2 ** ctx.attemptNumber * 100 }))
  .build();

const result = await retry.execute(() => fetch('https://api.example.com/data').then((r) => r.json()));

console.log(retry.getStats());
// { totalRequests: 1, successfulRequests: 1, failedRequests: 0, totalRetries: 2 }
```

## Extending

Subclass `Retry` and override any of the protected lifecycle hooks to add telemetry without changing the retry logic. All hooks are no-ops in the base class.

```typescript
import { Retry } from '@studnicky/retry';
import type { ErrorClassificationInterface, RetryConfigInterface } from '@studnicky/retry';

class InstrumentedRetry extends Retry {
  readonly events: string[] = [];

  constructor(config?: Partial<RetryConfigInterface>) {
    super(config ?? {});
  }

  protected override onRetryScheduled(attemptNumber: number, delayMs: number): void {
    this.events.push(`scheduled attempt=${attemptNumber} delay=${delayMs}ms`);
  }

  protected override onGiveUp(
    error: Error,
    attemptNumber: number,
    reason: 'aborted' | 'exhausted' | 'nonRetryable'
  ): void {
    this.events.push(`giveUp reason=${reason} attempt=${attemptNumber} err=${error.message}`);
  }
}

const retry = new InstrumentedRetry({ maxRetries: 2 });
// retry.events is populated as the FSM progresses
```

Override `classifyError` to supply domain-specific retry decisions without providing a full classifier object:

```typescript
class DatabaseRetry extends Retry {
  protected override classifyError(error: Error): ErrorClassificationInterface {
    if (error.message.includes('deadlock')) {
      return { retryable: true, reason: 'Transient deadlock' };
    }
    return { retryable: false };
  }
}
```

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/retry

## License

MIT
