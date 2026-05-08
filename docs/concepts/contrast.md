# Contrast enforcement

iridis enforces contrast at pipeline time, not at render time. By the time `engine.run()` resolves, every declared contrast pair has been checked and any failing foreground role has been adjusted. You receive a palette that already satisfies your accessibility requirements.

## WCAG 2.1 — contrastWcag21

The WCAG 2.1 algorithm computes relative luminance from gamma-corrected sRGB values, then produces a ratio between the lighter and darker luminances. The ratio ranges from 1:1 (identical colors) to 21:1 (black on white).

Standard thresholds:

| Use case | Ratio | WCAG level |
|---|---|---|
| Normal text (< 18pt / < 14pt bold) | 4.5:1 | AA |
| Large text (≥ 18pt / ≥ 14pt bold) | 3.0:1 | AA |
| Normal text | 7.0:1 | AAA |
| Large text | 4.5:1 | AAA |
| Non-text UI elements, focus rings | 3.0:1 | AA |

The core `enforce:contrast` task reads `input.roles.contrastPairs` and `input.contrast.extra`, then calls `ctx.math.invoke('contrastWcag21', fg, bg)` for each pair whose `algorithm` is `'wcag21'` (the default). The contrast plugin's `enforce:wcagAA` and `enforce:wcagAAA` tasks are convenience wrappers that apply the same logic with pre-set threshold levels.

## APCA — contrastApca

APCA (Accessible Perceptual Contrast Algorithm, APCA-W3 0.0.98G-4g) uses separate exponents for foreground and background luminance, producing an asymmetric Lc (lightness contrast) value. Results are signed: positive means light background, negative means dark background. The magnitude indicates contrast strength.

Practical APCA thresholds:

| Use case | Lc magnitude |
|---|---|
| Body text (small, thin) | ≥ 75 |
| Fluent text (normal body) | ≥ 60 |
| Large text / headlines | ≥ 45 |
| Non-text / icons | ≥ 30 |

`contrastApca` is registered in `mathBuiltins` and is available via `ctx.math.invoke('contrastApca', text, background)`. The iridis contrast plugin provides `enforce:apca` which applies APCA thresholds to pairs declared with `algorithm: 'apca'`.

To use APCA in a role schema contrast pair, set `algorithm: 'apca'` and use Lc magnitude as `minRatio`:

```ts
contrastPairs: [
  { foreground: 'text', background: 'canvas', minRatio: 60, algorithm: 'apca' },
]
```

## CVD simulation — EnforceCvdSimulate

`enforce:cvdSimulate` (`packages/contrast/src/tasks/EnforceCvdSimulate.ts`) is an advisory task, not a corrective one. It simulates protanopia, deuteranopia, and tritanopia using Brettel/Viénot matrices applied in linear sRGB, recomputes the WCAG luminance contrast for each simulated pair, and emits warnings when the simulated contrast drops more than 1.0 below the original.

The warnings are written to `state.metadata.wcag.cvd`:

```ts
// After engine.run()
const cvd = state.metadata.wcag?.cvd;
for (const w of cvd?.warnings ?? []) {
  console.warn(
    `${w.foreground}/${w.background}: ${w.cvdType} drops contrast by ${w.drop.toFixed(2)}`
  );
}
```

CVD simulation does not modify `state.roles`. It surfaces information; your design decisions about hue selection or additional contrast margins are out of scope for the engine.

## ensureContrast — the iterative nudge

`ensureContrast` (`packages/core/src/math/EnsureContrast.ts`) is the math primitive that `enforce:contrast` calls when a pair fails. It works by:

1. Checking whether the current foreground already meets `minRatio` against the background. If yes, returns it unchanged.
2. Determining direction: if the foreground is darker than the background, step lightness down (toward black); if lighter, step up (toward white).
3. Iterating up to 50 steps of 0.02 OKLCH lightness each, testing the ratio after each step.
4. Returning the first candidate that meets the threshold, or the final candidate if no step succeeded.

The step size (0.02) is small enough to produce smooth changes but bounded (max 50 steps = 1.0 lightness range) to prevent infinite loops. The primitive is registered by name (`'ensureContrast'`) so custom implementations can replace it:

```ts
engine.math.register({
  name: 'ensureContrast',
  apply(fg, bg, minRatio, algorithm) {
    // alternative implementation
  },
});
```

## The contrast report

After `enforce:contrast` runs, `state.metadata.contrastReport` contains a structured report:

```ts
interface ContrastReport {
  foreground: string;   // role name
  background: string;   // role name
  algorithm:  string;
  ratio:      number;   // final ratio after any adjustment
  minRatio:   number;
  passed:     boolean;
  adjusted:   boolean;  // true if ensureContrast was invoked
}
```

Inspect this in tests or CI to verify your palette meets requirements before shipping:

```ts
const report = state.metadata.contrastReport as ContrastReport[];
const failures = report.filter(r => !r.passed);
if (failures.length > 0) {
  throw new Error(`Contrast failures: ${JSON.stringify(failures, null, 2)}`);
}
```
