# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `SampleBuffer.create({ capacity })` static factory — the single validated construction entry point.
- `SampleBuffer.builder()` returns a `SampleBufferBuilder` for fluent construction via `.withCapacity(n).build()`.
- `SampleBufferBuilder` class (separate file, single export) for fluent `SampleBuffer` construction.
- `SampleBufferOptionsEntity` namespace with JSON Schema, `Type`, and `validate` for options validation.
- Constructor is now `protected`; construction through `new SampleBuffer()` outside the class is no longer possible.

## [1.0.0] - 2026-06-22

### Added

- Fixed-capacity circular buffer that maintains a sliding window of numeric samples, evicting the oldest sample when capacity is reached.
- `percentile(pct)` method with linear interpolation for any percentile in the 0–100 range; returns `undefined` on an empty buffer.
- Protected lifecycle hooks (`onEvict`, `onPush`, `onClear`, `onPercentile`) with no-op defaults for subclass observability.
- `length` and `isFull` accessors for introspecting current buffer state.
