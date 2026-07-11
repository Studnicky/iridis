# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `EventBus.builder<T>()` — fluent builder entry point. Returns an `EventBusBuilder<T>` whose `build()` produces the bus. Uniform API for no-config construction.
- `BusQueue.builder<T>()` — fluent builder with `withHandler()`, `withHighWaterMark()`, `withOnError()`, and `withSignal()` setters. `build()` validates and throws `BusQueueConfigError` on bad config.
- `BusQueue.create<T>(options)` — static factory accepting a single `BusQueueCreateOptionsType<T>` options object `{ handler, highWaterMark?, onError?, signal? }`. Both `create` and `builder().build()` funnel through the protected constructor, which is the single validation gate.
- `BusQueueBuilder<T>` and `EventBusBuilder<T>` exported from the package barrel and available as named imports.
- `BusQueueCreateOptionsType<T>` type exported for consumers that assemble options programmatically.

### Changed

- `EventBus` and `BusQueue` constructors are now `protected` (were `private`/`public` respectively). Direct `new EventBus()` / `new BusQueue(handler, options?)` from outside the class file is no longer the intended path — use `EventBus.create()` / `BusQueue.create(options)` instead.
- Handler callbacks now receive the subscription `AbortSignal` as a second argument (`(payload, signal)`). The signal aborts when the subscriber is unsubscribed, when a caller-supplied signal aborts, or when the bus is closed. Callbacks can pass it to `fetch()` or check `signal.aborted` to cancel long-running async work.

## [1.0.0] - 2026-06-22

### Added

- `BusQueue<T>` — bounded async FIFO queue with configurable `highWaterMark` backpressure. `enqueue()` blocks the caller when the queue is at capacity; the handler runs sequentially via a microtask-scheduled drain loop. Supports `AbortSignal` for cancellation and an `onError` callback so handler errors do not halt delivery.
- `EventBus<TTopicMap>` — typed multi-topic pub/sub. Each subscriber receives its own `BusQueue` so backpressure and errors are isolated per subscriber. `subscribe()` returns an `UnsubscribeFn`; `publish()` fans out to all registered subscribers on the topic. `drain()` awaits all in-flight queues; `close()` aborts all subscriber queues and drains. Constructed via `EventBus.create<TTopicMap>()`.
