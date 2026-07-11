# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- `Timing`, `NoOpTiming`, and `TimingEvent` class construction is reified: all instances are created through `static create()` or `static builder().build()`, both funneling through a protected validating constructor. Direct `new` from outside the class file is disallowed.
- `Timing.create(options?)` is the direct factory for the timing tracker; `Timing.builder()` returns a `TimingBuilder` configured via the create-closure idiom.
- `NoOpTiming.builder()` returns a `NoOpTimingBuilder` — consistent zero-config uniform API.
- `TimingBuilder` uses private fields (`#create`, `#config`) and a private constructor, matching the canonical builder pattern.

## [1.0.0] - 2026-06-22

### Added

- `Timing` builder with configurable `maxEvents` cap (LRU eviction) and `precision` options for nanosecond-resolution elapsed time output.
- `TimingEvent` builder producing structured `component.operation[.status]` event names for consistent metric keys across instrumented code.
- `TIMING_STATUS` constants covering the full lifecycle vocabulary (`start`, `complete`, `error`, `timeout`, `hit`, `miss`, `queued`, `dequeued`, `waiting`, `acquired`, `released`, `abort`).
- `NoOpTiming` implementation satisfying `TimingInterface` with zero overhead — suitable for test contexts and production code paths where timing collection is disabled.
- Protected `readHrtime()` and `onEvent()` override seams on `Timing` for deterministic testing and instrumentation without altering the public API.
