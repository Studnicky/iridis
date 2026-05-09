---
title: Try it out
---

# Try it out

This is the engine, end to end, against your config. Pick seeds, pick a framing, pick a contrast level — every demo on the site re-runs (this one included), the docs theme itself recomputes, and your settings persist across pages via `localStorage`. The light/dark toggle in the navbar is wired to the same `framing` value, so flipping the theme swaps clamp envelopes for every token.

## The configuration

<TryItOutForm />

## The pipeline

This single demo runs the full canonical core pipeline against your config above: `intake:hex` → `clamp:count` → `resolve:roles` → `expand:family` → `enforce:contrast` → `derive:variant` → `emit:json`. Click any seed to edit it with the OKLCH-aware picker. Switch tabs at the bottom for the resolved roles, the role schema (editable, validated), and the live code that matches what you're seeing.

<IridisDemo
  :pipeline="['intake:hex', 'clamp:count', 'resolve:roles', 'expand:family', 'enforce:contrast', 'derive:variant', 'emit:json']"
/>
