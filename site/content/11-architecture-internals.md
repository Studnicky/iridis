---
title: Architecture Internals
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

## Site State Machines

The demo site drives its interaction state through `@studnicky/fsm` machines. Each machine owns a transition protocol; events carry their own transition behavior, so a new event adds a class rather than a branch.

- **`IridisUiMachine`** owns carousel interaction: idle and dragging states for the picker and image modes, an active index that can never go negative, and effects that the composable applies to palette parameters such as the contrast standard, CVD mode, and strict compliance.
- **`ColorGraphLifecycleMachine`** owns the color graph runtime: construct, device ready, fit, settle, zoom, and suspend. `ColorGraphMountController` drives it from the carousel: the active face holds one live graph, and a face that becomes inactive disposes the graph behind a snapshot of its last frame. Fit and zoom-idle timers live on the controller and are cancelled with the graph. A settled graph that receives no pointer, keyboard or focus input for `idleSuspendMs` disposes its live instance behind the snapshot, because the WebGL loop of `@cosmos.gl/graph` cannot be paused; the next pointer, keyboard or focus input mounts a new instance. The layout, zoom, pan and fit floor are kept across both idle suspension and carousel face changes, and the legend filters live outside the graph; hover state is not kept.
- **`TocBarMachine`** owns the table-of-contents bar presentation, from the top of the page to past the hero.

## Worker Lanes

Palette resolution and the schema reachability check run in one engine worker, each as its own request lane. The reachability lane uses latest-wins sequencing in the request client, so a stale reply is dropped instead of overwriting newer state. The worker is single-threaded; lanes run in arrival order.

## Visualization Budget

`pnpm run profile:viz` drives the colour graph and the Mermaid diagrams in a production build and fails when a target exceeds `VisualizationProfileBudget` in `site/visualization-profile.mjs`: average, p90 and maximum frame time, long-task count and total, DOM element count, and canvas element count. The limits come in three classes. The Mermaid scenes carry no live WebGL and keep the strict frame and long-task limits. The live graph scenes (`graph` and `graphDpad`) are software-rendered WebGL in CI, so their class bounds regressions while the graph draws. The `graphIdle` target waits for the graph to reach idle suspension through the real idle path and is held to the strict limits of the Mermaid scenes, with average and p90 frame-time bounds widened by whole vsync steps to allow for the carousel face the idle graph sits on: the steady state of an idle graph is measured by that class. The DOM and canvas limits are shared. Sampling starts once the graph lifecycle reports `settled`. Collapsed code blocks tokenize and mount only their preview lines, so the prerendered HTML of a long output contains those lines until "Show full file" is selected. The starfield is painted on one canvas, the colour field repaints at a low rate, and the grid pans in whole-pixel steps, so the fixed ambient layers redraw a few times a second instead of every frame. Wrapped swatch rows mount their measurement clone only while a measurement is pending.
