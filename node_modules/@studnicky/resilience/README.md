# @studnicky/resilience

> Circuit breaker, token bucket rate limiter, and bounded dead-letter queue — composable and independently usable.

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/resilience)

Three standalone resilience primitives for async TypeScript services: a three-state circuit breaker that fast-fails when a dependency is unhealthy, a token bucket rate limiter that controls throughput with optional backpressure, and a bounded dead-letter queue that captures failed items for later retry via an async generator.

Each primitive is independently usable and composes naturally — wrap a rate-limited call with a circuit breaker, or pipe circuit breaker rejections into a DLQ for reprocessing.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/resilience
```

## Usage

### CircuitBreaker

Tracks failures and opens the circuit after a threshold, then probes with a limited number of calls after a timeout.

```typescript
import { CircuitBreaker, CircuitBreakerOpenError } from '@studnicky/resilience';

const breaker = CircuitBreaker.create({
  failureThreshold: 5,    // open after 5 consecutive failures
  resetTimeoutMs: 10_000, // probe after 10 s
  successThreshold: 2,    // close after 2 successes in half-open
  name: 'payment-api',
});

try {
  const result = await breaker.execute(() => callPaymentApi(request));
} catch (err) {
  if (err instanceof CircuitBreakerOpenError) {
    // Circuit is open — fast-fail without calling the remote
  }
}

breaker.state;      // 'closed' | 'open' | 'halfOpen'
breaker.reset();    // force-close
breaker.forceOpen(); // force-open for testing
```

### TokenBucket

Token bucket rate limiter. `consume` throws immediately when exhausted; `waitForToken` blocks until tokens refill.

```typescript
import { TokenBucket, TokenBucketExhaustedError } from '@studnicky/resilience';

const bucket = TokenBucket.create({
  requestsPerSecond: 10,
  burstSize: 20, // allow bursts up to 20 tokens
});

// Non-blocking — throws when empty
try {
  bucket.consume();
  await sendRequest();
} catch (err) {
  if (err instanceof TokenBucketExhaustedError) {
    // Rate limit exceeded
  }
}

// Blocking — waits until a token is available
const controller = new AbortController();
await bucket.waitForToken({ tokens: 1, signal: controller.signal });
await sendRequest();

bucket.available; // current token count
```

### DeadLetterQueue

Bounded FIFO queue for items that failed processing. Drain via async generator.

```typescript
import { DeadLetterQueue } from '@studnicky/resilience';

const dlq = DeadLetterQueue.create<JobPayload>({ capacity: 1000 });

// Enqueue failed items
try {
  await processJob(job);
} catch (err) {
  dlq.enqueue(job, 'processing failed', err instanceof Error ? err : undefined);
}

// Drain asynchronously
for await (const entry of dlq.drain()) {
  console.log(entry.id, entry.reason, entry.enqueuedAtMs);
  await retryJob(entry.item);
}

dlq.close(); // drain loop stops after current entries are consumed
```

### DeadLetterQueueRetryGenerator — timed re-delivery

```typescript
import { DeadLetterQueue, DeadLetterQueueRetryGenerator } from '@studnicky/resilience';

const dlq = DeadLetterQueue.create<JobPayload>();
const retryGen = DeadLetterQueueRetryGenerator.create({ dlq, intervalMs: 5_000 });

for await (const entry of retryGen.generate()) {
  await retryJob(entry.item); // each entry is yielded with a 5 s pause between
}
```

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/resilience

## License

MIT
