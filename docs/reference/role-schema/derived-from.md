---
title: Derived roles
description: Parametric expansion of one role into a family — derivedFrom names the parent, hueOffset rotates around the OKLCH hue wheel.
---

# Derived roles

A role with `derivedFrom: 'other-role-name'` declares itself as a parametric **child** of another role. The engine's `expand:family` task fills the derived role from the parent's resolved value, with optional `hueOffset` to rotate around the OKLCH hue wheel.

## Shape

| Field | Type | Meaning |
|---|---|---|
| `derivedFrom` | `string` | Name of the parent role (must exist in `roles[]`). |
| `hueOffset` | `number` | Degrees to rotate the parent's hue. Positive = clockwise on the OKLCH hue ring. |

## What it does

`expand:family` runs after `resolve:roles` and before `enforce:contrast`. For each role with `derivedFrom`:
1. Look up the parent's resolved OKLCH coordinates.
2. Copy `L` and `C` (clamped to the child's own `lightnessRange` / `chromaRange`).
3. Rotate the parent's `h` by `hueOffset` (mod 360).
4. Reconstruct the child's RGB / hex from the rotated OKLCH.

The child inherits the parent's lightness and chroma — only hue differs. This is what makes a single brand seed produce an entire syntax-token family: `syntax-string` is `brand` shifted +120°, `syntax-number` is `brand` shifted +60°, etc.

## What it means

Derivation encodes **family relationships**. A schema with `text-strong` derived from `text` says "text-strong is the strong tier of text — it lives where text lives, just shifted". A schema with `syntax-keyword` derived from `brand` says "all syntax tokens orbit the brand colour".

The engine guarantees that if the parent moves (because the user picked a different seed), every child moves with it on the same hue arc. Designers author the relationship *once* in the schema, and every palette the user produces preserves it.

## How to author

- Use `derivedFrom` whenever the child's identity depends on the parent's. Brand-derived syntax tokens, status-derived signal colours, text-derived emphasis tiers.
- Pair `derivedFrom` with `lightnessRange` / `chromaRange` envelopes that the inherited `L` / `C` will land inside. The inherited values are clamped, so a too-narrow range will collapse the derivation back toward grey.
- Pick `hueOffset` values that produce **perceptually distinct** results. Multiples of 30° (`30`, `60`, `90`, `120`, `150`, `180`, ...) keep the family ring-like.
- Don't chain derivations more than two levels deep. `expand:family` is a single pass — a grandchild that derives from a child only sees the child's pre-expansion state, which is unusual but well-defined.

## Related

- [Hue lock](./hue-lock) — opposite knob: pin a role's hue regardless of seed.
- [Lightness range](./lightness-range) and [Chroma range](./chroma-range) — the envelopes the inherited values are clamped into.
- [Role schemas overview](../../concepts/role-schemas).
