# Accessibility calculations

iridis treats accessibility as a constraint the engine satisfies, not an afterthought you audit. Three layers do the work: contrast measurement, contrast enforcement, and CVD simulation. Each is a registered math primitive — swap or extend without touching task code.

::: tip Live demo
Toggle **Contrast level** and **Contrast algorithm** in the sidebar config to see `enforce:contrast` lift role pairs to the selected threshold in real time. The chip you see is the chip your users get.
:::

## WCAG 2.1 contrast — `contrastWcag21`

The web's incumbent metric. Computes a luminance ratio `(L₁ + 0.05) / (L₂ + 0.05)` where `L₁ ≥ L₂`, against gamma-decoded sRGB primaries. The result is unitless and ranges 1.0 (no contrast) to 21.0 (white on black).

| Tier | Ratio | Use |
|------|-------|-----|
| AA   | ≥ 4.5 | Body text |
| AA Large | ≥ 3.0 | 18pt+ regular or 14pt+ bold |
| AAA  | ≥ 7.0 | High-stakes body text |
| Non-text | ≥ 3.0 | UI components, focus rings |

Strengths: ubiquitous, legally cited, easy to reason about. Weaknesses: model is a 1990s simplification — it underweights blue-on-black and overweights bright on white.

## APCA — `contrastApca`

The Advanced Perceptual Contrast Algorithm under development for WCAG 3. Models polarity (light-on-dark vs dark-on-light), uses a perceptual lightness curve closer to OKLCH, and produces a signed value `Lc` in roughly `[-108, +108]`.

| Use | Lc threshold |
|-----|--------------|
| Body text | ≥ 75 |
| Large copy | ≥ 60 |
| Non-text UI | ≥ 45 |
| Spot text | ≥ 30 |

iridis exposes both. Pick the algorithm in `input.contrast.algorithm`. Plugins targeting the same threshold value get different behavior under each — APCA is stricter on dark-on-dark, more permissive on saturated-on-light.

## `contrastPairs` — declaring intent

A role schema declares its accessibility requirements as a list of `contrastPairs`. Each pair names the foreground role, the background role, the minimum ratio (or Lc), and optionally an explicit algorithm.

```ts
export const mySchema: RoleSchemaInterface = {
  name:  'my-palette',
  roles: [ /* ... */ ],
  contrastPairs: [
    { foreground: 'text',     background: 'canvas', minRatio: 4.5, algorithm: 'wcag21' },
    { foreground: 'onAccent', background: 'accent', minRatio: 4.5, algorithm: 'wcag21' },
    { foreground: 'border',   background: 'canvas', minRatio: 3.0, algorithm: 'wcag21' },
  ],
};
```

Pairs are not opt-in. Every pair you declare is a hard contract — `enforce:contrast` will adjust foreground roles until the ratio is satisfied.

## `enforce:contrast` — the nudge loop

Built on `ensureContrast`, this task walks every declared pair after `resolve:roles` has assigned candidates. For each pair below threshold:

1. Compare foreground and background lightness.
2. Pick a step direction in OKLCH: push foreground darker (if lighter than bg) or lighter (if darker).
3. Step by `0.02` lightness, recompute, recheck.
4. Bail at 50 iterations or when L hits the [0, 1] clamp.

Hue and chroma are preserved. The result is a foreground that *looks the same* as the input but reads against the background. Combined with the role's declared `lightnessRange`, the task respects both the design constraint and the accessibility constraint — a contradiction surfaces as a reachable-extremum, not silent failure.

## CVD simulation — Brettel-Viénot

The `iridis-contrast` plugin (separate package) ships three CVD primitives: `cvdDeuteranopia`, `cvdProtanopia`, `cvdTritanopia`. Each transforms an input color into what a viewer with that color vision deficiency would perceive. Use them to:

- Simulate a pair under CVD before publishing.
- Run `enforce:contrast` against the simulated pair (not the original) for CVD-aware AA.
- Surface palette pairs that collapse under simulation as `metadata.cvdConflicts`.

The plugin is opt-in. The core engine ships only the WCAG and APCA metrics.

## Why declare instead of validate

Most palette tools generate first, audit second. iridis flips it: you declare what must be true, the engine produces output that is already true. There is no "accessibility report" because there is no version of the palette that fails. The contract is the schema.

If a pair cannot be satisfied — for instance, a foreground locked into a narrow lightness range that cannot meet 7:1 against a likewise-narrow background — `enforce:contrast` produces the closest reachable approximation and records the remaining gap in `state.metadata.contrastShortfalls`. You see the conflict at run time, in code, not three sprints after launch in a Jira ticket.
