# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [4.0.0] - 2026-06-28

### Changed

- **Breaking:** the `retryInterceptor` pipeline is replaced by a protected `onRetryScheduled(context)` lifecycle hook. Subclass `Retry` and override it to set `context.delayMs` (using a shipped `BackoffStrategy`), set `context.abort` to stop retrying, or mutate `context.state` across attempts (the hook may be async). Removed: the `retryInterceptor` config field and builder method, the `RetryInterceptorType` type, and the `isRetryInterceptor` guard. The package no longer depends on `@studnicky/pipeline`.
- `Retry`, `DefaultHttpErrorClassifier` construction goes through `static create(options?)` and `static builder()` factory methods. Constructors are non-public. `Retry.builder()` uses the create-closure idiom (type-only import cycle-free).
- `RetryBuilder` adopts the create-closure idiom: `static create(createFn)` instead of a constructor-reference; private fields replace the `config` plain object.
- `ErrorClassifier` abstract base gains a `protected constructor()`.
- `DefaultHttpErrorClassifierBuilder` added as the builder companion for `DefaultHttpErrorClassifier`.

## [1.0.0] - 2026-06-22

### Added

- `Retry` class with configurable `maxRetries`, pluggable error classifiers, and a retryInterceptor pipeline for per-attempt delay control.
- Protected lifecycle hooks (`onAttempt`, `onSuccess`, `onRetryableError`, `onRetryScheduled`, `onGiveUp`) for zero-cost observability via subclassing.
- Per-call FSM (`RetryCallStateType`: `attempting` / `waiting` / `succeeded` / `failed` / `exhausted` / `aborted`) with overridable `guardCall` and `enterCall` hooks.
- `DefaultHttpErrorClassifier` with built-in classification for HTTP 5xx, 429, 408, network errors, and early-retry unknown errors; `ErrorClassifier` base class for custom implementations.
