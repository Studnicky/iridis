# Hex

A hex color is an sRGB triple encoded as three or four bytes in hexadecimal.

## Syntax

iridis accepts two forms:

| Form | Bytes | Channels |
|---|---|---|
| `#rrggbb` | 3 | red, green, blue |
| `#rrggbbaa` | 4 | red, green, blue, alpha |

The leading `#` is optional in user input but the canonical stored form keeps it. Each byte ranges `00`-`ff` (0-255). Case is normalised to lower-case on storage.

The three-digit shorthand `#rgb` and the four-digit `#rgba` are not accepted. Anything other than six or eight hexadecimal characters after the optional `#` is rejected.

## Conversion

A hex string converts to floating-point sRGB by reading each byte and dividing by 255. Alpha follows the same rule when present, otherwise defaults to 1.

```
r = parseInt(hex[0:2], 16) / 255
g = parseInt(hex[2:4], 16) / 255
b = parseInt(hex[4:6], 16) / 255
a = hex.length === 8 ? parseInt(hex[6:8], 16) / 255 : 1
```

The reverse direction multiplies each channel by 255, rounds, and pads to two hexadecimal digits. The canonical hex written back from a `ColorRecord` is always six digits, alpha lives in the `alpha` field, not in the hex string.

## Math primitives

| Primitive | File | Behaviour |
|---|---|---|
| `hexToRgb` | `packages/core/src/math/HexToRgb.ts` | parses a hex string and returns a full `ColorRecord` via `ColorRecordFactory.fromHex` |
| `rgbToHex` | `packages/core/src/math/RgbToHex.ts` | writes three sRGB channels as `#rrggbb` |

`ColorRecordFactory.fromHex` (`packages/core/src/math/ColorRecordFactory.ts`) holds the validation regex `^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$` and the alpha extraction logic. It populates the OKLCH coordinates by routing the parsed sRGB through the same path `fromRgb` uses, so a record built from hex is interchangeable with one built from any other intake.

## Where it appears

- `intake:hex` (`packages/core/src/tasks/intake/IntakeHex.ts`) consumes hex strings from `input.colors` and produces `ColorRecord` entries.
- `intake:any` dispatches hex inputs to `intake:hex`.
- `emit:cssVars` and the stylesheet plugin write hex back out as the default serialised form.
- The visual picker (`docs/.vitepress/theme/components/IridisPicker.vue`) round-trips hex on every edit through HSV → RGB → hex.
