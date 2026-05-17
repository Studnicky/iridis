---
title: Chroma range
description: The OKLCH C-channel envelope the engine clamps each role into. Two numbers in 0..~0.5.
---

# Chroma range

The `[min, max]` envelope on the OKLCH **C** channel that the engine clamps the resolved role into. Encodes how saturated a role is allowed to be — neutrals near `0`, accents near `0.25+`.

## Shape

| Field | Type | Range |
|---|---|---|
| `chromaRange[0]` | `number` | `[0, ~0.5]`, lower bound |
| `chromaRange[1]` | `number` | `[0, ~0.5]`, upper bound, `>= [0]` |

The practical upper limit is `~0.4` — beyond that most hues fall outside the sRGB and Display-P3 gamuts and get mapped back during emit.

## What it does

`clamp:oklch` checks each role's C against `chromaRange`:
- `C < chromaRange[0]` → push to `chromaRange[0]`. Forces a minimum saturation; useful for accents that must not collapse to grey.
- `C > chromaRange[1]` → pull to `chromaRange[1]`. Forces a maximum saturation; useful for surfaces and text roles that must stay near-neutral regardless of seed.

## What it means

Chroma encodes **how chromatic** a role is — independent of which hue. A `muted` text role with `chromaRange: [0, 0.04]` will stay near-grey even if the user supplies a violent magenta seed.

- Neutral roles (`background`, `text`, `divider`, `surface`): `[0, 0.06]`.
- Muted roles (`muted`, `text-subtle`, `border`): `[0, 0.08]`.
- Accent roles (`brand`, `link`, `success`, `error`): `[0.10, 0.32]`.
- Highly chromatic roles (syntax tokens, signal colours): `[0.14, 0.32]`.

## How to author

- Pair every chroma range with a sensible lightness range. A high chroma at low lightness produces deep saturated colours; high chroma at high lightness produces pastels.
- Keep the **upper bound** at or below `0.32` for sRGB-only emit targets. Anything higher falls outside sRGB for most hues and gets gamut-mapped to a duller value.
- Use the **same** chroma range in dark and light framing variants unless you specifically want one mode to read as more saturated than the other.

## Related

- [Lightness range](./lightness-range) — the orthogonal envelope on the L channel.
- [OKLCH reference](../oklch) — full conversion math + chroma boundaries.
- [Role schemas overview](../../concepts/role-schemas).
