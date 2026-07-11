# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-22

### Added

- `Predicates` — comprehensive static-method class for JSON Schema draft 2020-12 primitive validation.
  - Type: `matchesType`, `matchesAnyType`, `inferValueType`, `isFiniteNumber`, `isIntegerValue`.
  - Coercion: `coerceValue`, `coerceToBoolean`, `coerceToNumber`.
  - String (Unicode code-point aware): `checkMinLength`, `checkMaxLength`, `checkPattern`, `satisfiesMinLength`, `satisfiesMaxLength`, `satisfiesPattern`, `codePointLength`, `satisfiesContentEncoding`, `satisfiesContentMediaType`.
  - Numeric (epsilon-tolerant): `checkMinimum`, `checkMaximum`, `checkMultipleOf`, `satisfiesMinimum`, `satisfiesMaximum`, `satisfiesExclusiveMinimum`, `satisfiesExclusiveMaximum`, `satisfiesMultipleOf`.
  - Array: `checkMinItems`, `checkMaxItems`, `checkUniqueItems`, `satisfiesMinItems`, `satisfiesMaxItems`, `satisfiesUniqueItems`, `satisfiesContains`.
  - Object: `checkRequired`, `hasAllRequiredProperties`, `hasNoAdditionalProperties`, `satisfiesMinProperties`, `satisfiesMaxProperties`.
  - Const/Enum: `satisfiesConst`, `satisfiesEnum`.
- `CoerceToBooleanResultType` and `CoerceToNumberResultType` — exported result types for coercion methods.
