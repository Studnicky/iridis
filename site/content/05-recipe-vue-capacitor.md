---
title: 5. Recipe: Vue + Capacitor Per-Category Palettes
description: A worked example wiring Iridis into a Vue 3 + Capacitor app for per-category dynamic palettes.
---

A worked example of the mapping strategy: `examples/vue-capacitor/categoryColorService.ts` is a service that takes a category name and a seed hex color, runs the Iridis pipeline, writes scoped CSS custom properties to the document, and returns Capacitor `StatusBar` parameters for native chrome.

`CategoryColorService` is a singleton that owns a single `Engine` instance configured at construction time. The engine is set up once; individual calls to `apply(category, seed)` just invoke `engine.run()` with a new input.

<<< @/examples/vue-capacitor/categoryColorService.ts#construct

The `private constructor` + `static shared()` pattern wires the engine once. Each service owns its own `Engine` instance and therefore its own isolated `TaskRegistry`, which matters when multiple services in the same application need different pipeline configurations.

## From seed to palette

Using seed `#8B5CF6` (a mid-purple, high chroma) against `categoryW3cRoleSchema`: `intake:any` parses the hex and converts it to OKLCH (approximately L=0.62, C=0.27, H=293). `resolve:roles` assigns it to the `accent` role; `canvas`, `surface`, and `text` receive the same seed as their only candidate, but their `lightnessRange` constraints push them to their range centers during `expand:family`'s second pass. `enforce:wcagAA` then checks all four contrast pairs in the schema and nudges foreground roles until each pair meets 4.5:1 (text) or 3.0:1 (border).

`emit:cssVars` writes `state.outputs['stylesheet:cssVars']` with three shapes: `full` (a single CSS string with all custom properties), `scopedBlock` (a scoped `[data-category="music"] { ... }` block), and `map` (a `Record<string, string>` of property name to value). `emit:capacitorStatusBar` writes `state.outputs['capacitor:statusBar']`, and `emit:capacitorTheme` writes `state.outputs['capacitor:theme']`.

## Applying CSS variables dynamically

<<< @/examples/vue-capacitor/categoryColorService.ts#apply

Any component that sets `data-category="music"` on its root element automatically picks up the derived palette via CSS custom property inheritance.

## Vue 3 SFC integration

<<< @/examples/vue-capacitor/MusicCategoryView.vue

```ts
// Re-skin when the user switches category
async function onCategoryChange(category: string, seed: string) {
  const { statusBar } = await categoryColorService.apply(category, seed);
  await StatusBar.setBackgroundColor({ color: statusBar.backgroundColor });
  await StatusBar.setStyle({ style: statusBar.style === 'DARK' ? Style.Dark : Style.Light });
}
```

The `emit:capacitorStatusBar` task writes `state.outputs['capacitor:statusBar'].backgroundColor` (the resolved `surface`/`topBar` role hex) and `.style` (`'DARK'` or `'LIGHT'` depending on background luminance) — pass these directly to the Capacitor `StatusBar` plugin.

In v1, iridis re-derives one category palette per call; calling `apply()` for different categories in sequence is supported, and multiple categories can coexist in the DOM simultaneously as long as they use distinct `data-category` values. Full living-color animation (smooth palette morphing between categories) is a v2 concern — see the [Roadmap section](#roadmap-living-color) of the architecture page.
