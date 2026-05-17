---
title: Living color
description: The v2 thesis — treat a palette as a vector in OKLCH × N-roles space and animate between points while WCAG and role-schema constraints hold every frame
---

# Living color

A palette is a point in OKLCH × N-roles vector space. A static theme is a frozen point. A living palette is a path through that space, the way a chameleon or a cephalopod chromatophore does not pick a color but animates along a trajectory while preserving constraints (visibility, contrast, biological viability).

The v1 engine derives one point. The v2 thesis is that the same engine can animate between points and continue to enforce the same constraints (WCAG, role schemas, palette algebra) on every frame.

## Vector-space framing

A palette of N roles is a vector of length 3·N:

```
[L₁, C₁, h₁,  L₂, C₂, h₂,  ...,  Lₙ, Cₙ, hₙ]
```

Each role contributes three coordinates in OKLCH. Two palettes are two points in that space. Animation is a parameterised curve

```
t ∈ [0, 1]  →  palette(t)
```

that moves continuously from one point to another.

Easings shape the curve: linear, cubic-bezier, spring, or chromatic detour (a path that visits a third point so a warm-to-cool transition passes through green rather than brown). Hue wraparound has its own degree of freedom, clockwise, counter-clockwise, or shortest-arc.

The constraint stack runs per frame. A full pipeline derivation is well under a millisecond budget for a 12-role schema, which leaves room for `enforce:contrast` to keep WCAG ratios satisfied at every intermediate point on the curve.

## Palette algebra

Vector framing makes a small algebra fall out for free.

| Operation | Meaning |
|---|---|
| `lerp(a, b, 0.3)` | thirty percent of the way from `a` toward `b` |
| `a − b` | per-role OKLCH delta vector |
| `nearest(a, corpus)` | closest preset to a custom palette under a perceptual metric |
| `drift(current, derived) > θ` | "the user adjusted accent past tolerance, re-derive?" |
| `perpendicular(a, axis)` | move orthogonally on the chroma plane while holding L and h |

These are not separate features. They are consequences of treating the palette as a vector and the pipeline as a function from vector to vector.

## Reactive bindings

Once the engine produces palette(t), the parameter t can come from anywhere, a clock, an audio FFT bin, scroll position, focus state, ambient light, weather data, a finite-state machine over user mood. The engine does not need to know the source. The binding layer reads a signal, maps it to t, and asks the engine for the palette at that point.

This is the second half of the thesis. A static palette answers "what colors". A living palette answers "what colors right now, given what is happening".

## Why this matters

A theme that responds to time, content, and context is closer to the way colour works in nature than the catalogues of frozen tokens that ship with most design systems. The wedge is the combination: vector palettes plus role schemas plus contrast enforcement plus animation plus reactive signals, in one engine, with the constraints holding on every frame.
