---
title: 2. The Four Stages
description: The four conceptual stages of iridis and how data flows through the pipeline.
---

Every iridis pipeline passes through four conceptual stages, even though the task names and execution order are fully controlled by you:

```
intake → resolve → enforce → emit
```

## The Data Flow

Each stage reads from and writes to a shared, mutable state object — a task's own manifest documents exactly which `reads` and `writes` it touches:

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

`enforce` tasks nudge foreground colors until every contrast pair meets its required ratio; `emit` tasks aren't part of palette-building itself — they run afterward, writing the resolved state into consumer-shaped output such as CSS variables, a VS Code theme JSON, or Capacitor status bar parameters.

## TaskRegistry, the Spine

A `TaskRegistry` is a `Map<string, TaskInterface>`. Every task has a string `name`; the engine owns one registry instance, and calling `engine.pipeline([...])` with an ordered list of stage names validates that every name is registered before storing the order, then executes them in that order during `engine.run()`. Lifecycle hooks (`onRunStart`, `onRunEnd`) let plugins initialize or flush state without occupying a pipeline slot.

For every registered, non-lifecycle task named by `manifest.requires`, the engine validates that the required task is present earlier in the pipeline. A missing or out-of-order predecessor fails during `engine.pipeline()`. Callers and plugins remain responsible for registering tasks before declaring the sequence; `reads` and `writes` document state flow but do not create dependencies automatically.

## Plugins Bring the Optional Stages

Core `intake`/`resolve`/`emit` stages ship with iridis itself. Optional `enforce` stages — WCAG AA/AAA, APCA, and CVD simulate — are contributed by plugins such as `@studnicky/iridis-contrast`, switched on or off per project.

A plugin is any object satisfying `PluginInterface` (a `name`, a `version`, and a `tasks()` method); `engine.adopt(plugin)` registers all of a plugin's tasks in one call. iridis ships seven plugins beyond the core task set: `@studnicky/iridis-vscode`, `-stylesheet`, `-tailwind`, `-image`, `-contrast`, `-capacitor`, and `-rdf`. Each is a separate package — install only what a project needs.
