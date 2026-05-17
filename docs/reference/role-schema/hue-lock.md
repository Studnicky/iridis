---
title: Hue lock
description: Pin a role to an exact OKLCH hue regardless of the seed. The opposite knob to derivedFrom + hueOffset.
---

# Hue lock

A role with `hueLock` declared takes a fixed OKLCH hue, ignoring whatever hue the seed produces. Use it when a role's identity depends on a specific colour family — `success` is **green**, `error` is **red**, `link` is **blue** — regardless of what the user picked as a brand seed.

## Shape

| Field | Type | Meaning |
|---|---|---|
| `hueLock` | `number` | Degrees on the OKLCH hue ring (`0..360`). Optional. Mutually exclusive with `derivedFrom`. |

When `hueLock` is present, the engine ignores the seed's hue for this role and uses `hueLock` directly. Lightness and chroma still come from the seed (clamped into the role's envelopes).

## What it does

`resolve:roles` substitutes the locked hue value before checking the seed against the role's lightness / chroma envelopes:
1. Take the seed's `L` and `C`.
2. Replace its `h` with `hueLock`.
3. Clamp `L` and `C` into `lightnessRange` / `chromaRange`.
4. Emit the role.

## What it means

Hue lock is the **anti-parametric** option. `derivedFrom` says "follow another role"; `hueLock` says "follow nobody, I have my own hue." Together they're the two ways a role can refuse to drift with the seed.

Typical hue-lock anchors:

| Role | Typical hue |
|---|---|
| `success` | `135` (green) |
| `warning` | `75`  (yellow) |
| `error` / `critical` | `25` (red) |
| `info` | `220` (blue) |
| `link` | `255` (indigo) |

## How to author

- Use `hueLock` on roles whose **semantic meaning** depends on cultural colour associations (success = green, error = red).
- Don't lock a brand role's hue — the brand IS what the user is supplying as the seed.
- Pair `hueLock` with a chroma range tight enough that the locked hue reads clearly. A locked green at `C ≤ 0.04` is just a slightly-warm grey.
- `hueLock` and `derivedFrom` together is a contradiction — the schema validator rejects roles that declare both.

## Related

- [Derived roles](./derived-from) — the opposite knob: inherit a parent's hue with an offset.
- [Chroma range](./chroma-range) — controls how much the locked hue can be expressed.
- [Role schemas overview](../../concepts/role-schemas).
