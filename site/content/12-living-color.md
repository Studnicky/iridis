---
title: "12. Living Color"
description: Animating between palette points while every constraint keeps holding on each frame — see it live in the Motion and Color stream cards above.
---

## Living color

A static palette is one frozen point. Living Color animates a palette from one point to another while every constraint the engine already enforces — role schemas, WCAG/APCA contrast — keeps holding at each intermediate frame, not just at the two endpoints. See it live: the **Motion** card's duration/easing sliders drive `--iridis-tune`/`--iridis-ease`, the same two CSS variables every color transition on this page runs on, and the **Color stream** card seismographs each decorative role's live chroma drift in real time. Five packages implement this, in addition to the single-point derivation `@studnicky/iridis` core already does:

| Package | Provides |
|---|---|
| `iridis-algebra` | Palette vector math: `lerp`, `subtract`, `nearest`, `drift`, `perpendicular` |
| `iridis-anima` | Curve evaluation + easings: `evaluate`, `evaluateStops`, `evaluateEnforced`, `linear`/`cubicBezier`/`spring`/`chromaticDetourHue` |
| `iridis-fsm` | `PaletteStateMachine` — tick-driven transitions with `onEnterState`/`onExitState`/`onTransitionRejected` hooks |
| `iridis-pulse` | Signal bindings: `ClockBinding` (real or virtual time), `ValueBinding` |
| `iridis-trajectory` | Named animation curves: `TrajectoryRegistry`, plus built-ins (`sunriseTrajectory`, `duskFadeTrajectory`, `focusPulseTrajectory`) |

### Palette as a vector

A palette of N roles is a vector in OKLCH × N-roles space, length 3·N:

```
[L₁, C₁, h₁,  L₂, C₂, h₂,  ...,  Lₙ, Cₙ, hₙ]
```

Treating the palette this way makes a small algebra fall out for free — these are `iridis-algebra`'s exports, not separate features:

| Operation | Meaning |
|---|---|
| `lerp(a, b, 0.3)` | thirty percent of the way from `a` toward `b` |
| `subtract(a, b)` | per-role OKLCH delta vector |
| `nearest(a, corpus)` | closest preset to a custom palette under a perceptual metric |
| `drift(current, derived, threshold)` | "the user adjusted accent past tolerance, re-derive?" |
| `perpendicular(a, axis)` | move orthogonally on the chroma plane while holding L and h |

### Curves and easings

`iridis-anima`'s `evaluate(stops, t)` walks a parameterised curve `t ∈ [0, 1] → palette(t)` between two or more palette stops. Easings shape how `t` maps onto perceived motion: `linear`, `cubicBezier`, `spring`, or `chromaticDetourHue` — a path that visits a third hue so a warm-to-cool transition passes through green rather than the muddy midpoint a naive lerp produces (compare this live in the Color stream card's naive-RGB-vs-OKLCH bands). Hue wraparound direction — `shortestArc`, `clockwise`, `counterClockwise` — is a property of each curve, not a global setting. `evaluateEnforced`/`evaluateStopsEnforced` run `enforce:contrast` at each evaluated frame, so an animated transition never passes through a frame that fails its contrast target.

### Driving `t` from something other than a clock

`iridis-pulse`'s `ClockBinding` and `ValueBinding` read a signal and map it to `t`; `iridis-fsm`'s `PaletteStateMachine` drives state transitions off ticks rather than a single continuous curve. The engine itself never needs to know where `t` comes from — a wall clock, scroll position, focus state, or (per `iridis-trajectory`'s built-ins) a named trajectory like a sunrise fade. This is what the ambient background's living palette and the Motion card's unison-duration slider both run on.

A static palette answers "what colors". A living palette answers "what colors right now, given what's happening" — the same constraint stack (role schemas, contrast enforcement) holding on every frame, not just the ones a static theme freezes.
