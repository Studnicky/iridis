---
title: 2. Core Architecture
description: The four conceptual stages of iridis and how data flows through the shared PaletteState.
---

The interactive controls above demonstrate *what* the pipeline does. This section covers *how* it works under the hood. 

Every iridis pipeline passes through four conceptual stages, even though the task names and execution order are fully controlled by you:

```
intake → resolve → enforce → emit
```

## The Data Flow

::mermaid-diagram
---
code: |
  flowchart TD
      A["input.colors\n(raw strings / objects)"]
      B["state.colors\n(ColorRecord[])"]
      C["state.roles\n(Record<string, ColorRecord>)"]
      D["state.roles\n(contrast-adjusted)"]
      E["state.variants\n(light / dark)"]
      F["state.outputs\n(cssVars, tailwind, shadcn ...)"]

      A -->|intake tasks| B
      B -->|resolve:roles| C
      C -->|enforce:contrast| D
      D -->|derive:variant| E
      D -->|emit tasks| F
      E -->|emit tasks| F
---
::

## The Task Registry

The `TaskRegistry` is the spine of the engine. It acts as a map of `TaskInterface` objects. Every task has a string `name` (e.g., `'intake:any'`). 

```ts
import { TaskRegistry } from '@studnicky/iridis';

const registry = new TaskRegistry();
registry.register(myCustomTask);
registry.has('my:custom');          // true
```

The `Engine` owns one `TaskRegistry` instance (`engine.tasks`). When you call `engine.pipeline(['intake:any', 'resolve:roles', ...])`, the engine validates that every name is registered before storing the execution sequence. 

## Shared State

Every task receives the same mutable `PaletteStateInterface` object during execution. Tasks read from and write to named slots on this state. 

A task's dependencies are documented via the `reads` and `writes` arrays in its manifest (which you can see visualized in the **Pipeline** accordion above).

```ts
readonly manifest: TaskManifestInterface = {
  name:    'resolve:roles',
  reads:   ['colors', 'input.roles'],
  writes:  ['roles', 'metadata'],
};
```

The engine **does not** enforce dependency ordering at runtime—that is your responsibility via the pipeline array. If a task writes `state.roles` and a later task reads `state.roles`, your `engine.pipeline()` array must reflect that execution order.
