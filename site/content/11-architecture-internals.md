---
title: 11. Architecture Internals
description: The TaskRegistry class and the shared PaletteState that every task reads and writes.
---

## The Task Registry

The `TaskRegistry` is the spine of the engine. It acts as a map of `TaskInterface` objects. Every task has a string `name` (e.g., `'intake:any'`).

```ts
import { TaskRegistry } from '@studnicky/iridis';

const registry = new TaskRegistry();
registry.register(myCustomTask);
registry.has('my:custom');          // true
```

The `Engine` owns one `TaskRegistry` instance (`engine.tasks`). When you call `engine.pipeline(['intake:any', 'resolve:roles', ...])`, the engine validates that every name is registered before storing the execution sequence.

Its real implementation is small: a name-keyed `Map`, plus two lifecycle queues (`onRunStart`, `onRunEnd`) that hooked tasks additionally join.

<<< @/packages/core/src/registry/TaskRegistry.ts

## Shared State

Every task receives the same mutable `PaletteStateInterface` object during execution. Tasks read from and write to named slots on this state.

A task's dependencies are documented via the `reads` and `writes` arrays in its manifest (which you can see visualized in the **Pipeline** accordion on the [The Four Stages](#02-the-four-stages) card).

```ts
readonly manifest: TaskManifestInterface = {
  name:    'resolve:roles',
  reads:   ['colors', 'input.roles'],
  writes:  ['roles', 'metadata'],
};
```

For every registered, non-lifecycle task named by `manifest.requires`, the engine checks that the required task appears earlier in the pipeline. `engine.pipeline()` rejects missing and out-of-order predecessors. Callers and plugins remain responsible for registering tasks before declaring the sequence, and the `reads` and `writes` arrays remain documentation rather than inferred dependencies.

The manifest shape itself, along with the `TaskInterface` every task implements:

<<< @/packages/core/src/types/pipeline.ts
