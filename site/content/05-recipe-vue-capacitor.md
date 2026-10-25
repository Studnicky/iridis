---
title: "Recipe: Vue + Capacitor Per-Category Palettes"
description: A worked example wiring Iridis into a Vue + Capacitor app for per-category dynamic palettes.
---

A worked example of the mapping strategy: `site/app/examples/vueCapacitor/categoryColorService.ts` is a service that takes a category name and a seed hex color, runs the Iridis pipeline, writes scoped CSS custom properties to the document, and returns Capacitor `StatusBar` parameters for native chrome.

`CategoryColorService` owns an `Engine` instance configured at construction time. Calls to `apply(category, seed)` invoke `engine.run()` with a new input.

<<< @/site/app/examples/vueCapacitor/categoryColorService.ts#construct

The `private constructor` + `static shared()` pattern wires the engine during service construction. Each service owns an isolated `TaskRegistry`, which matters when services in the same application need different pipeline configurations.

## From seed to palette

`intake:any` normalizes the seed, `resolve:roles` assigns it through the schema, and `expand:family` derives schema-authored roles. `enforce:compliance` applies the selected `input.contrast` standard and CVD mode; `report:compliance` records terminal measurements. The service reparses emitted hexadecimal values, independently recomputes WCAG, and re-simulates CVD matrices with each linear channel clamped before gamma encoding. A palette that cannot satisfy the terminal contract throws without creating or changing a style element.

`emit:cssVars` writes `state.outputs['stylesheet:cssVars']` with `full` (the complete CSS string), `scopedBlock` (the `[data-category='music'] { ... }` block), and `map` (the role-to-custom-property mapping). `emit:capacitorStatusBar` writes `state.outputs['capacitor:statusBar']`, and `emit:capacitorTheme` writes `state.outputs['capacitor:theme']`. The returned `compliance` member is the engine compliance report, `wcagPairs` contains measurements rebuilt from the terminal emitted values, and `cvd` contains the terminal simulation result.

## Applying CSS variables dynamically

<<< @/site/app/examples/vueCapacitor/categoryColorService.ts#apply

Any component that sets `data-category="music"` on its root element automatically picks up the derived palette via CSS custom property inheritance.

Category names are lowercase kebab-case identifiers. The service rejects invalid names before pipeline execution so untrusted text cannot alter the generated selector or style-element identifier.

## Vue SFC integration

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

iridis re-derives a category palette for each `apply()` call. Different categories can coexist in the DOM as long as they use distinct `data-category` values. See the [living-color architecture](#roadmap-living-color) for palette morphing guidance.
