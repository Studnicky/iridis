# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- `ContextBuilder` constructor is now `private`; obtain instances via `Context.builder()` which internally calls `ContextBuilder.create(closure)`. The builder is not constructed directly.
- `ContextScope` constructor is now `protected`; construct via `ContextScope.create(options)` or `ContextScope.builder().withName().withStorage().build()`. The options object (`ContextScopeOptionsInterface`) accepts `name`, `storage` (AsyncLocalStorage), and optional `initial` values. Construction validates `name` (non-empty string) and `storage` (AsyncLocalStorage instance), throwing `ContextConfigError` on invalid input.
- `ContextScope.builder()` returns a new `ContextScopeBuilder` with `withName()`, `withStorage()`, and `withInitial()` fluent setters.

### Added

- `ContextScopeBuilder` — fluent builder for `ContextScope`, exported from the package barrel.
- `ContextScopeOptionsInterface` — construction options shape for `ContextScope`, exported from the package barrel.

## [1.0.0] - 2026-06-22

### Added

- `Context` class providing per-request async isolation via `AsyncLocalStorage`, with `get`/`set`/`tryGet`/`delete`/`has`/`keys`/`snapshot` store operations and `isActive()` guard.
- `ContextScope` FSM (`created → active → terminated`) returned from `Context.initialize()`, with `execute()` for store-bound execution and `terminate()` to extract final state.
- Protected extension hooks: `Context.onInitialize` for seeding default values at scope construction, `Context.onMissingContext` for lenient-mode suppression, and `ContextScope.onEnter`/`onBeforeExecute`/`onAfterExecute`/`onTerminate` for FSM observability.
- `ContextBuilder` fluent API (`Context.builder().name('...').build()`) for declarative construction with an overridable `validateBuild` hook.
