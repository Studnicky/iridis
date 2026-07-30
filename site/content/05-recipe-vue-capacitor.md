---
title: "5. Recipe: Vue + Capacitor Per-Category Palettes"
description: A worked example wiring Iridis into a Vue 3 + Capacitor app for per-category dynamic palettes.
---

A worked example of the mapping strategy: `site/app/examples/vueCapacitor/categoryColorService.ts` is a service that takes a category name and a seed hex color, runs the Iridis pipeline, writes scoped CSS custom properties to the document, and returns Capacitor `StatusBar` parameters for native chrome.

`CategoryColorService` is a singleton that owns a single `Engine` instance configured at construction time. The engine is set up once; individual calls to `apply(category, seed)` just invoke `engine.run()` with a new input.

<<< @/site/app/examples/vueCapacitor/categoryColorService.ts#construct

The `private constructor` + `static shared()` pattern wires the engine once. Each service owns its own `Engine` instance and therefore its own isolated `TaskRegistry`, which matters when multiple services in the same application need different pipeline configurations.

## From seed to palette

Using seed `#8B5CF6` (a mid-purple, high chroma) against `categoryW3cRoleSchema`: `intake:any` parses the hex and converts it to OKLCH (approximately L=0.61, C=0.22, H=293). `resolve:roles` assigns it to the `accent` role and clamps it to the schema's L 0.35–0.46 and C 0.10–0.12 brand range. `expand:family` derives `onAccent` at the light end of its declared range. The terminal `#5b4894` accent and `#fcfcfc` foreground have a WCAG 2.1 contrast ratio of approximately 7.31:1.

The AAA-strength schema requires 7:1 for all three text relations and 3:1 for the non-text border relation. The maximal pipeline evaluates those relationships through WCAG AA, WCAG AAA, APCA, and corrective CVD simulation. The text role's L 0.10–0.23 and C 0.08–0.09 range produces terminal `#201042`, which reaches approximately 13.53:1 on canvas and 11.11:1 on surface. Final APCA magnitudes are Lc 86.50, 75.50, 83.71, and 50.58 for the configured relations. The service reparses the emitted hexadecimal values, independently recomputes WCAG and APCA, and re-simulates every CVD matrix with each linear channel clamped before gamma encoding. A palette that cannot satisfy the terminal contract throws without creating or changing a style element.

`emit:cssVars` writes `state.outputs['stylesheet:cssVars']` with `full` (the complete CSS string), `scopedBlock` (the `[data-category='music'] { ... }` block), and `map` (the role-to-custom-property mapping). `emit:capacitorStatusBar` writes `state.outputs['capacitor:statusBar']`, and `emit:capacitorTheme` writes `state.outputs['capacitor:theme']`. The returned `wcagAa`, `wcagAaa`, and `apca` members contain measurements rebuilt from the terminal emitted values; `cvd` contains the terminal simulation result.

## Applying CSS variables dynamically

<<< @/site/app/examples/vueCapacitor/categoryColorService.ts#apply

Any component that sets `data-category="music"` on its root element automatically picks up the derived palette via CSS custom property inheritance.

Category names are lowercase kebab-case identifiers. The service rejects invalid names before pipeline execution so untrusted text cannot alter the generated selector or style-element identifier.

## Vue 3 SFC integration

<<< @/site/app/examples/vueCapacitor/MusicCategoryView.vue

```ts
// Re-skin when the user switches category
async function onCategoryChange(category: string, seed: string) {
  const { statusBar } = categoryColorService.apply(category, seed);
  await StatusBar.setBackgroundColor({ color: statusBar.backgroundColor });
  await StatusBar.setStyle({ style: statusBar.style === 'DARK' ? Style.Dark : Style.Light });
}
```

The `emit:capacitorStatusBar` task writes `state.outputs['capacitor:statusBar'].backgroundColor` (the resolved `surface`/`topBar` role hex) and `.style` (`'DARK'` or `'LIGHT'` depending on background luminance) — pass these directly to the Capacitor `StatusBar` plugin.

In v1, iridis re-derives one category palette per call; calling `apply()` for different categories in sequence is supported, and multiple categories can coexist in the DOM simultaneously as long as they use distinct `data-category` values. Full living-color animation (smooth palette morphing between categories) is a v2 concern — see the [Roadmap section](#roadmap-living-color) of the architecture page.
