# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-22

### Added

- `ConfigValidation` pure-static class with assertion methods (`assertString`, `assertNumber`, `assertBoolean`, `assertInteger`, `assertFinite`, `assertNonNegative`, `assertPositive`, `assertMin`, `assertPositiveOrInfinity`, `assertHasMethod`, `assertFunctionOrObjectWithMethod`, `assertNoUnknownKeys`) that throw `ConfigurationError` on failure and skip validation for `undefined`/`null` values.
- `TypeGuards` pure-static class with type predicates (`isObject`, `isFunction`, `isNonNegativeInteger`, `isPositiveInteger`) for runtime type narrowing.
- `ConfigurationError` error class with static `create(message, cause?)` factory, fixed error code `config.invalid`, and `retryable: false` semantics via `BaseError`.
- `ensureError` utility that safely converts any caught `unknown` value to an `Error` instance.
