# Changelog

## [Unreleased]

### Changed
- `EffectInterpreter` construction uses `EffectInterpreter.create({ machine, handlers?, machineId? })` and `EffectInterpreter.builder()` factory methods. Constructor is protected; direct `new EffectInterpreter(...)` from outside the class is no longer accessible.
- `StateMachine` abstract base has a protected constructor for uniformity; concrete subclasses funnel through it.
- `EffectInterpreterBuilder` exported from the package barrel.

## [1.0.0] - 2026-06-22

### Added
- `StateMachine` abstract base class with `transition()` wrapper and `ReducerThrewError`
- `EffectInterpreter` with async FIFO mailbox, observer subscriptions, and effect dispatch
- `MachineRegistry` module-singleton for name-based interpreter lookup
