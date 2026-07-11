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

## Roadmap: living color

The architecture above derives one point. The v2 thesis is that the same engine can animate between points and continue to enforce the same constraints, WCAG, role schemas, palette algebra, on every frame.

A palette of N roles is a vector in OKLCH × N-roles space, length 3·N:

```
[L₁, C₁, h₁,  L₂, C₂, h₂,  ...,  Lₙ, Cₙ, hₙ]
```

A static theme is a frozen point in that space. A living palette is a path through it, the way a chameleon or a cephalopod chromatophore does not pick a color but animates along a trajectory while preserving constraints (visibility, contrast, biological viability). Animation is a parameterised curve `t ∈ [0, 1] → palette(t)` that moves continuously from one point to another. Easings shape the curve: linear, cubic-bezier, spring, or chromatic detour (a path that visits a third point so a warm-to-cool transition passes through green rather than brown). Hue wraparound has its own degree of freedom, clockwise, counter-clockwise, or shortest-arc.

The constraint stack runs per frame. A full pipeline derivation is well under a millisecond budget for a 12-role schema, which leaves room for `enforce:contrast` to keep WCAG ratios satisfied at every intermediate point on the curve.

### Palette algebra

Vector framing makes a small algebra fall out for free:

| Operation | Meaning |
|---|---|
| `lerp(a, b, 0.3)` | thirty percent of the way from `a` toward `b` |
| `a − b` | per-role OKLCH delta vector |
| `nearest(a, corpus)` | closest preset to a custom palette under a perceptual metric |
| `drift(current, derived) > θ` | "the user adjusted accent past tolerance, re-derive?" |
| `perpendicular(a, axis)` | move orthogonally on the chroma plane while holding L and h |

These are not separate features. They are consequences of treating the palette as a vector and the pipeline as a function from vector to vector.

### Reactive bindings

Once the engine produces `palette(t)`, the parameter `t` can come from anywhere: a clock, an audio FFT bin, scroll position, focus state, ambient light, weather data, a finite-state machine over user mood. The engine does not need to know the source. A binding layer reads a signal, maps it to `t`, and asks the engine for the palette at that point.

A static palette answers "what colors". A living palette answers "what colors right now, given what is happening". The wedge is the combination: vector palettes plus role schemas plus contrast enforcement plus animation plus reactive signals, in one engine, with the constraints holding on every frame. The planned `iridis-anima` plugin will carry this forward from v1's single-point derivation.
