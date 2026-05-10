# ColorRecord

`ColorRecordInterface` is the canonical internal representation of a color in iridis. Every intake task produces `ColorRecord` objects. Every math primitive operates on them. Every role in `state.roles` is a `ColorRecord`. The type is defined in `packages/core/src/model/types.ts`.

## OKLCH-first

iridis stores every color in OKLCH as the primary representation, with RGB, hex, and optional Display P3 as cached projections. OKLCH (Lightness, Chroma, Hue) is a perceptually uniform color space: equal numeric steps produce equal perceived changes regardless of hue.

Two practical consequences:

1. **Predictable mixing.** `mixOklch(a, b, 0.5)` produces a midpoint that looks visually centered between `a` and `b`. The same operation in sRGB produces muddy browns when crossing warm/cool hues.
2. **Reliable contrast adjustment.** `ensureContrast` nudges the `oklch.l` field in fixed 0.02 steps. Because lightness is perceptually linear in OKLCH, each step produces a consistent perceived change, the nudge converges predictably.

The trade-off: OKLCH can represent colors outside the sRGB gamut. iridis clamps chroma at 0.5 (the practical sRGB ceiling for most hues) and lightness to [0, 1]. Display P3 values are computed on demand and cached in `displayP3`.

## Field reference

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `oklch.l` | `number` | 0-1 | Perceptual lightness |
| `oklch.c` | `number` | 0-0.5 | Chroma (0 = neutral grey) |
| `oklch.h` | `number` | 0-360 | Hue angle in degrees |
| `rgb.r` | `number` | 0-1 | Linear sRGB red channel |
| `rgb.g` | `number` | 0-1 | Linear sRGB green channel |
| `rgb.b` | `number` | 0-1 | Linear sRGB blue channel |
| `hex` | `string` | `#rrggbb` | Lowercase 6-digit hex |
| `alpha` | `number` | 0-1 | Opacity (1 = opaque) |
| `sourceFormat` | `SourceFormatType` | see below | Format the color was parsed from |
| `displayP3` | `RgbInterface?` | 0-1 per channel | Wide-gamut projection (optional) |
| `hints` | `ColorHintsInterface?` |, | Caller-supplied routing metadata |

`SourceFormatType` is a union: `'hex' | 'rgb' | 'hsl' | 'oklch' | 'lab' | 'named' | 'imagePixel'`. Intake tasks set this field to record provenance.

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

`hints.intent` is a `ColorIntentType` (`'base' | 'accent' | 'muted' | 'critical' | 'positive' | 'neutral' | 'surface' | 'text'`). It is informational, plugins and custom tasks can read it for secondary routing decisions, but the core pipeline does not act on it directly.

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
