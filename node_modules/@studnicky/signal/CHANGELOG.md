# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-22

### Added

- `Signal.never()` returning a cached, never-aborting `AbortSignal` sentinel — eliminates repeated `new AbortController().signal` boilerplate.
- `Signal.compose({ signal?, deadlineMs? })` composing caller signal and/or timeout into a single `AbortSignal`. Returns the caller signal directly when no deadline is supplied, a timeout signal when no caller signal is supplied, `AbortSignal.any([...])` when both are given, and the never sentinel when neither is provided.
- `Signal.timeout(ms)` as a thin, named wrapper over `AbortSignal.timeout` for call-site clarity.
