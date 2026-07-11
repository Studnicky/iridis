# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `Pipeline.create<T>()` static factory — the single validated construction path; replaces direct `new Pipeline()`.
- `Pipeline.builder<T>()` static method returning a `PipelineBuilder<T>` via the create-closure idiom.
- `PipelineBuilder<T>` class (own file, single export) with private constructor, `static create(closure)`, and `build()` — no `withX()` setters since `Pipeline` carries no configuration.
- `Pipeline` constructor is now `protected`, preventing external `new Pipeline()` while preserving subclassability and `new this()` in `create()`.

## [1.0.0] - 2026-06-22

### Added

- `Pipeline<T>` class providing a generic typed async pipeline for sequential context transforms
- `add(fn)` method to register transform functions; returns an unsubscribe function for individual stage removal
- `run(ctx)` method to execute all registered stages in order, passing each stage's output as the next stage's input
- `clear()` method to remove all registered transform functions
- `stages` getter exposing a readonly view of registered transform functions
- Protected lifecycle hooks — `onRunStart`, `beforeStage`, `afterStage`, and `onRunComplete` — that subclasses can override to observe or intercept pipeline execution at each fire point
