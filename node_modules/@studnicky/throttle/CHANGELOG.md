# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- `Throttle` constructor is protected; instances are created via `Throttle.create(config?)` or `Throttle.builder()`.
- `ThrottleBuilder` constructor is private; obtain a builder via `Throttle.builder()` which injects the create closure.
- `static builder(): ThrottleBuilder` added to `Throttle` — returns a fluent builder with `withConcurrencyLimit()` and `withAdaptiveConcurrency()`.

## [1.0.0] - 2026-06-22

### Added

- `Throttle` class with configurable `concurrencyLimit` (default 10) and sliding window execution — queued operations start as soon as a slot is released.
- `execute<T>(fn)` returns `Promise<T | undefined>`; operations resolve with `undefined` when the throttle is aborted (detach-and-abandon pattern).
- `abort(options?)` cancels all queued and active operations immediately (or after a grace-period timeout), returning `AbortResultInterface` with cancelled, completed, and timedOut counts.
- Optional adaptive concurrency via `AdaptiveConfigInterface` — automatically scales the concurrency limit up or down based on observed p95 latency.
