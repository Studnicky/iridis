# CMYK

CMYK (cyan, magenta, yellow, key/black) is the subtractive process model used by four-color print. Each channel is the percentage of one ink laid on a white substrate. K is the black plate, separated out so that dark colors do not require saturating all three chromatic inks.

## Coordinates

| Channel | Range | Meaning |
|---|---|---|
| C | `[0, 1]` or `[0, 100]` percent | cyan ink coverage |
| M | `[0, 1]` or `[0, 100]` percent | magenta ink coverage |
| Y | `[0, 1]` or `[0, 100]` percent | yellow ink coverage |
| K | `[0, 1]` or `[0, 100]` percent | black ink coverage |

CMYK is device-dependent. A real conversion needs an ICC profile for the target press, paper, and ink set. The browser-side approximation iridis uses is the standard naive transform with no profile applied — accurate enough for a UI control, not accurate enough to send to a printer.

## The K channel

Naive subtractive RGB → CMY would set `C = 1 − R`, `M = 1 − G`, `Y = 1 − B`. That works mathematically but is wasteful in practice: stacking three inks to render dark grey costs ink, dries slowly, and shifts hue. The K channel exists as the common minimum that gets pulled out of all three:

```
K = 1 − max(R, G, B)
C = (1 − R − K) / (1 − K)
M = (1 − G − K) / (1 − K)
Y = (1 − B − K) / (1 − K)
```

When `K = 1` (pure black), the chromatic channels are forced to zero to avoid division by zero. The reverse:

```
R = (1 − C) · (1 − K)
G = (1 − M) · (1 − K)
B = (1 − Y) · (1 − K)
```

## Math primitives

iridis does not export CMYK math primitives. CMYK exists only in the picker as a numeric I/O affordance — designers occasionally want to see what a screen color looks like in CMYK terms even when the output is digital.

## Where it appears

- `IridisPicker.vue` (`docs/.vitepress/theme/components/IridisPicker.vue`) provides a CMYK tab. Edits convert through CMYK → RGB → hex and emit a fresh hex on every change.
- The pipeline never receives CMYK input. There is no `intake:cmyk` task and no CMYK channel on `ColorRecord`.
