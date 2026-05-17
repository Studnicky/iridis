---
title: Lightness range
description: The OKLCH L-channel envelope the engine clamps each role into. Two numbers in 0..1.
---

# Lightness range

The `[min, max]` envelope on the OKLCH **L** channel that the engine clamps the resolved role into. If the seed colour the user supplies falls outside the envelope, `clamp:oklch` nudges it back in along constant chroma and hue.

## Shape

| Field | Type | Range |
|---|---|---|
| `lightnessRange[0]` | `number` | `[0, 1]`, lower bound |
| `lightnessRange[1]` | `number` | `[0, 1]`, upper bound, `>= [0]` |

## What it does

`clamp:oklch` runs after `intake:*` and before `resolve:roles`. For each role:
1. Look up the seed → OKLCH coordinates.
2. If `L < lightnessRange[0]`, push to `lightnessRange[0]`.
3. If `L > lightnessRange[1]`, pull to `lightnessRange[1]`.
4. Hue and chroma are untouched in this step.

The clamp is one-axis. `chromaRange` and (optionally) `hueOffset` clamp the other axes.

## What it means

Lightness envelopes encode role *function*, not aesthetic preference.

- A `text` role declares a high L range (e.g. `[0.85, 0.96]` dark framing, `[0.10, 0.22]` light framing) because text MUST be readable against the surrounding surface, and readability is a luminance contrast property.
- A `surface` role declares a low L range in dark framing and a high L range in light framing — the framing flip *is* the lightness flip.
- A `muted` text role declares a slightly compressed L range so it reads as quieter than primary text without disappearing.

## How to author

- Author the dark- and light-framing variants as two separate schemas. The user's framing selection in `runtime.framing` picks which one feeds the engine — the same role with the same `name` can occupy `[0.85, 0.96]` in dark and `[0.10, 0.22]` in light.
- Keep the range **narrow** for surface and text roles (≤ 0.15 width) so the resolved colour stays inside the role's perceptual zone regardless of seed.
- Keep the range **wider** for accent roles (≥ 0.20 width) so the seed colour has room to express its identity.
- The range is in **perceptual** lightness, not RGB lightness. 0.5 in OKLCH is the same perceived brightness as 0.5 grey — unlike HSV V or HSL L.

## Related

- [Chroma range](./chroma-range) — the orthogonal envelope on the C channel.
- [OKLCH reference](../oklch) — full conversion math + range semantics.
- [Role schemas overview](../../concepts/role-schemas).
