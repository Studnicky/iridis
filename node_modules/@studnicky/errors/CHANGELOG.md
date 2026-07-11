# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- `ValidationErrors` constructor is now protected; construct via `ValidationErrors.create(items)` or `ValidationErrors.builder().addViolation(v).build()`.
- `ValidationErrors.of()`, `merge()`, and `fromValidatorErrors()` delegate to `create()`.
- `ValidationErrorsBuilder` is a new fluent builder class; exported from the package barrel.

## [1.0.0] - 2026-06-22

### Added

- `BaseError` abstract class with `code`, `timestamp`, `correlationId`, `retryable`, structured `toJSON()` and `toSerializedError()` serialization, and overridable `serializeExtra()` / `formatUserMessage()` hooks
- `ModuleError` with scenario-defaults API (`ErrorDefaults`), `context`, `statusCode`, and cause-chain traversal helpers (`getCauseChain`, `findCauseOfType`, `hasCauseOfType`)
- `ValidationError` for input validation failures with structured violation list; `CliExitError` for process exit codes
- `ErrorCode`, `ErrorDefaults`, and `HttpStatus` constant maps for standardized code and status assignment
