---
title: Contrast pairs
description: Foreground / background pairs that the engine enforces a minimum ratio on. The accessibility contract of a role schema.
---

# Contrast pairs

A `contrastPairs[]` entry declares that two roles, used together as foreground and background, MUST satisfy a minimum contrast ratio. The engine's `enforce:contrast` family (WCAG 2.1, APCA, CVD simulation) nudges role colours in OKLCH until every declared pair passes — the **accessibility contract** of the schema.

## Shape

```ts
interface ContrastPairInterface {
  foreground: string;          // role name
  background: string;          // role name
  minRatio:   number;          // 1..21 for WCAG; 0..107 for APCA Lc
  algorithm:  'wcag21' | 'apca';
}
```

| Field | Type | Meaning |
|---|---|---|
| `foreground` | `string` | Name of the role painted on top. |
| `background` | `string` | Name of the role painted underneath. |
| `minRatio` | `number` | Minimum contrast the pair must clear. Read against the chosen algorithm's scale. |
| `algorithm` | `'wcag21' \| 'apca'` | Which contrast formula to use. Defaults to `'wcag21'`. |

## What it does

`enforce:contrast` runs after `resolve:roles` and `expand:family`. For each declared pair:
1. Compute the actual contrast between the foreground and background using the selected algorithm.
2. If the ratio is already ≥ `minRatio`, do nothing.
3. If not, **nudge** the foreground in OKLCH (lift L for dark framing, drop L for light framing) until the ratio passes. Nudge stops when the foreground reaches the L bound of its envelope.
4. If the envelope can't accommodate the required contrast, log an advisory and move on. The role is best-effort; consumers can read `state.metadata.wcag.{aa,aaa,apca}.pairs[].pass` to see the verdict per pair.

The verdict surface is the **enforcement output**: pairs that pass cleanly, pairs that pass after nudging, pairs that failed and why. Plugins like the contrast badge on the resolved-roles card read this surface.

## What it means

A contrast pair is a **declarative accessibility constraint**, not a styling hint. Saying `{ foreground: 'text', background: 'background', minRatio: 7, algorithm: 'wcag21' }` is the schema's commitment that *whatever* seed the user picks, the engine will produce a `text` and `background` such that `text` on `background` clears 7:1.

Common pair sets:

- **Floor pairs**: `text` against every surface (`background`, `bg-soft`, `surface`). Without these, text is unreadable on at least one surface.
- **Brand pair**: `brand` against `background` at 3:1 (UI element threshold) — guarantees the brand is at least *visible*, even if not text-readable.
- **Status pairs**: `success`, `warning`, `error` against `background` at 4.5:1 — guarantees status messages remain legible.
- **Syntax pairs**: every `syntax-*` against `bg-soft` at 4.5:1 — guarantees code stays readable inside code blocks.

## How to author

- Declare a pair for **every foreground/background combination that will actually be painted**. Pairs not declared aren't enforced — the engine can't read your CSS.
- Use the **algorithm matching your design system**:
  - WCAG 2.1 — the legal floor for accessibility audits. `4.5:1` normal text, `3:1` large text.
  - APCA Lc — the perceptual algorithm targeted by WCAG 3. Lc ≥ 60 for normal text, ≥ 75 for body text, ≥ 90 for dense / chromatic body. Better behaviour on chromatic backgrounds and in dark mode.
- Use `minRatio: 7` for AAA-level pairs (text on body surfaces); `4.5` for AA-level pairs (text on chromatic accents); `3` for non-text UI elements (icons, dividers, focus rings).
- Declare pairs in both the dark and light framing variants of the schema. The engine flips L envelopes between framings, so pairs must be enforced separately for each.

## Related

- [WCAG 2.1 reference](../wcag) — luminance-ratio algorithm.
- [APCA reference](../apca) — perceptual contrast algorithm.
- [Contrast concept](../../concepts/contrast) — engine-level overview of the enforcement pipeline.
- [Accessibility calculations](../../concepts/accessibility-calculations) — what AA / AAA / APCA mean in practice.
- [Role schemas overview](../../concepts/role-schemas).
