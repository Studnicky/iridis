---
title: ColorRecord
description: The OKLCH-first internal color shape every iridis task reads and writes, with cached sRGB, hex, and conditional Display-P3 projections for wide-gamut output
---

# ColorRecord

`ColorRecordInterface` is the canonical internal representation of a color in iridis. Every intake task produces `ColorRecord` objects. Every math primitive operates on them. Every role in `state.roles` is a `ColorRecord`. The type is defined in `packages/core/src/types/color.ts` and re-exported via `@studnicky/iridis`, `@studnicky/iridis/model`, and `@studnicky/iridis/types`.

## OKLCH-first

iridis stores every color in OKLCH as the primary representation, with sRGB, hex, and optional Display-P3 as cached projections. OKLCH (Lightness, Chroma, Hue) is a perceptually uniform color space: equal numeric steps produce equal perceived changes regardless of hue. The full coordinate system, conversion math, and primitives are in the [OKLCH reference](../reference/oklch); the [RGB](../reference/rgb) and [Hex](../reference/hex) references cover the cached projections.

Two practical consequences:

1. **Predictable mixing.** `mixOklch.apply(a, b, 0.5)` produces a midpoint that looks visually centered between `a` and `b`. The same operation in sRGB produces muddy browns when crossing warm/cool hues.
2. **Reliable contrast adjustment.** `ensureContrast` nudges the `oklch.l` field in fixed 0.02 steps. Because lightness is perceptually linear in OKLCH, each step produces a consistent perceived change, the nudge converges predictably.

OKLCH bounds (canonical): `l ∈ [0, 1]`, `c ∈ [0, 0.5]`, `h ∈ [0, 360)`. The `oklch` slot is the only one that preserves wide-gamut intent across a full round-trip — an OKLCH point that sits outside sRGB is recorded verbatim and survives any later derivation that re-allocates through `colorRecordFactory.fromOklch`.

## Wide-gamut behaviour

`ColorRecord` has three colour-channel slots and they are not interchangeable:

- **`oklch`** — the input colour exactly as parsed. MAY lie outside the sRGB gamut. Consumers wanting wide-gamut fidelity read this slot.
- **`rgb`** / **`hex`** — always sRGB-safe. When the input OKLCH is out-of-sRGB, the factory gamut-maps to sRGB along constant L+H (CSS Color 4 §13.2.2) and stores the mapped value here. The mapping is lossy: a vivid `oklch(0.7 0.4 30)` lands in sRGB as a less-saturated colour. sRGB-only emitters (Capacitor StatusBar, Android `colors.xml`, Tailwind v4 theme JSON) read `rgb` / `hex` directly.
- **`displayP3`** — populated **conditionally**: only when (a) the input OKLCH was out-of-sRGB, OR (b) the record arrived through `intake:p3`. When the input is already fully sRGB-representable, `displayP3` is `undefined` so consumers can branch on `record.displayP3 !== undefined` to detect "this colour benefits from a wide-gamut output path" with a single null check.

`intake:p3` accepts CSS Color 4 `color(display-p3 r g b)` and `color(display-p3 r g b / alpha)` strings. The `intake:any` dispatcher routes those strings automatically — you almost never need to register `intake:p3` by name.

## Field reference

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `oklch.l` | `number` | 0-1 | Perceptual lightness |
| `oklch.c` | `number` | 0-0.5 | Chroma (0 = neutral grey) |
| `oklch.h` | `number` | 0-360 | Hue angle in degrees |
| `rgb.r` | `number` | 0-1 | sRGB red channel (gamut-mapped from OKLCH) |
| `rgb.g` | `number` | 0-1 | sRGB green channel (gamut-mapped from OKLCH) |
| `rgb.b` | `number` | 0-1 | sRGB blue channel (gamut-mapped from OKLCH) |
| `hex` | `string` | `#rrggbb` | Lowercase 6-digit hex derived from `rgb` |
| `alpha` | `number` | 0-1 | Opacity (1 = opaque) |
| `sourceFormat` | `SourceFormatType` | see below | Format the color was parsed from |
| `displayP3` | `RgbInterface \| undefined` | 0-1 per channel | Populated only when input is wide-gamut OR arrived via `intake:p3` |
| `hints` | `ColorHintsInterface \| undefined` | | Caller-supplied routing metadata |

`SourceFormatType` is an eight-value union: `'hex' | 'rgb' | 'hsl' | 'oklch' | 'lab' | 'named' | 'imagePixel' | 'displayP3'`. Intake tasks set this field to record provenance.

## hints, role and intent routing

`ColorRecord.hints` is an optional object that callers can attach to input colors before they enter the pipeline. `resolve:roles` checks `hints.role` before falling back to OKLCH distance scoring. If `hints.role === 'accent'`, that color wins the `accent` role regardless of its OKLCH position.

```ts
const state = await engine.run({
  colors: [{
    hex:   '#8B5CF6',
    hints: { role: 'accent', intent: 'accent' },
  }],
  roles: mySchema,
});
```

`hints.intent` is a `ColorIntentType` (`'text' | 'background' | 'accent' | 'muted' | 'critical' | 'positive' | 'link' | 'button' | 'onAccent' | 'onButton'`). It drives every downstream semantic decision: forced-colors token selection, APCA Lc target, WCAG required ratio, and capacitor StatusBar style. The schema author's declared intent is authoritative — no substring inference happens anywhere downstream.

`hints.weight` is a numeric priority hint. Higher weight breaks ties when two colors have identical OKLCH distance to a role center.

## sourceFormat, provenance

Every `ColorRecord` records the format it was parsed from. This lets downstream tasks and emitters behave differently for colors extracted from images (`'imagePixel'`) versus design-token hex values (`'hex'`). The RDF emitter uses `sourceFormat` to annotate triples with the originating representation.

## Creating a ColorRecord

Do not construct `ColorRecord` objects by hand. Use `colorRecordFactory`:

```ts
import { colorRecordFactory } from '@studnicky/iridis';

// From OKLCH coordinates
const color = colorRecordFactory.fromOklch(0.62, 0.18, 290, 1.0);

// From hex (parses → RGB → OKLCH)
const fromHex = colorRecordFactory.fromHex('#8B5CF6');
```

`ColorRecordFactory` (`packages/core/src/math/ColorRecordFactory.ts`) handles conversion and caching. The `displayP3` field is populated lazily if the color is out-of-gamut in sRGB.
