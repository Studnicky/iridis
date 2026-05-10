# Vue + Capacitor: per-category palettes

This recipe walks through `examples/vue-capacitor/categoryColorService.ts` — a service that takes a category name and a seed hex color, runs the iridis pipeline, writes scoped CSS custom properties to the document, and returns Capacitor StatusBar parameters for native chrome.

## What the service does

`CategoryColorService` is a singleton that owns a single `Engine` instance configured at construction time. The engine is set up once; individual calls to `apply(category, seed)` just invoke `engine.run()` with a new input.

```ts
import { Engine, mathBuiltins, coreTasks } from '@studnicky/iridis';
import { contrastPlugin }   from '@studnicky/iridis-contrast';
import { stylesheetPlugin } from '@studnicky/iridis-stylesheet';
import { capacitorPlugin }  from '@studnicky/iridis-capacitor';
import { categoryW3cRoleSchema } from './categoryW3cRoleSchema.ts';

export class CategoryColorService {
  private readonly engine: Engine;

  private constructor() {
    this.engine = new Engine();

    for (const primitive of mathBuiltins) this.engine.math.register(primitive);
    for (const task of coreTasks)         this.engine.tasks.register(task);

    this.engine.adopt(contrastPlugin);
    this.engine.adopt(stylesheetPlugin);
    this.engine.adopt(capacitorPlugin);

    this.engine.pipeline([
      'intake:any',
      'expand:family',
      'resolve:roles',
      'enforce:wcagAA',
      'derive:variant',
      'emit:cssVars',
      'emit:capacitorStatusBar',
      'emit:capacitorTheme',
    ]);
  }

  static shared(): CategoryColorService { /* singleton */ }

  async apply(category: string, seed: string): Promise<{ cssVars, statusBar }> { /* ... */ }
}
```

The `private constructor` + `static shared()` pattern wires the engine once. Constructing `Engine` directly (rather than importing the singleton `engine`) gives the service its own isolated registry, which matters when multiple services in the same application need different pipeline configurations.

## From seed to palette — the Music example

The Music category uses seed `#8B5CF6` — a mid-purple with high chroma.

`intake:any` parses it as hex, converts it to OKLCH (approximately L=0.62, C=0.27, H=293), and appends it to `state.colors`.

`expand:family` runs before role resolution. At this point `state.roles` is empty, so no derivations are triggered yet.

`resolve:roles` assigns `#8B5CF6` to the `accent` role (the only role without a `lightnessRange` that would score it far from the others). Other roles — `canvas`, `surface`, `text` — receive the same seed color as their only candidate, but their `lightnessRange` constraints push them to the range centers during `expand:family`'s second pass.

`enforce:wcagAA` checks all four contrast pairs in `categoryW3cRoleSchema` and nudges foreground roles until each pair meets 4.5:1 (text) or 3.0:1 (border).

`emit:cssVars` writes `state.outputs.cssVars` with three shapes:
- `full` — a single CSS string with all custom properties
- `scopedBlock` — a scoped `[data-category="music"] { ... }` block
- `map` — a `Record<string, string>` of property name to value

`emit:capacitorStatusBar` and `emit:capacitorTheme` populate `state.outputs.capacitor`.

## Applying CSS variables dynamically

`CategoryColorService.apply()` injects a scoped stylesheet into the document head:

```ts
async apply(category: string, seed: string) {
  const state = await this.engine.run({
    colors:   [seed],
    roles:    categoryW3cRoleSchema,
    contrast: { level: 'AA', algorithm: 'wcag21' },
    metadata: {
      category:     category,
      cssVarPrefix: '--c-',
      scopeAttr:    'data-category',
      scopePrefix:  'category',
      themeName:    category,
    },
  });

  const cssVars   = state.outputs['cssVars'];
  const capacitor = state.outputs['capacitor'];

  // Inject or replace the scoped stylesheet
  const sheetId = `ce-${category}-styles`;
  let sheet = document.getElementById(sheetId) as HTMLStyleElement | null;
  if (!sheet) {
    sheet = document.createElement('style');
    sheet.id = sheetId;
    document.head.appendChild(sheet);
  }
  sheet.textContent = `[data-category="${category}"] {\n${
    Object.entries(cssVars.map).map(([k, v]) => `  ${k}: ${v};`).join('\n')
  }\n}`;

  return { cssVars, statusBar: capacitor.statusBar };
}
```

Any component that sets `data-category="music"` on its root element automatically picks up the derived palette via CSS custom property inheritance.

## Vue 3 SFC integration

::: code-group

```vue [MusicCategoryView.vue]
<template>
  <div data-category="music" class="music-category-view">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { categoryColorService } from './categoryColorService.ts';

onMounted(async () => {
  await categoryColorService.apply('music', '#8B5CF6');
});
</script>
```

```ts [Dynamic re-skinning]
// Re-skin when the user switches category
async function onCategoryChange(category: string, seed: string) {
  const { statusBar } = await categoryColorService.apply(category, seed);
  // Update Capacitor StatusBar with the new values
  await StatusBar.setBackgroundColor({ color: statusBar.backgroundColor });
  await StatusBar.setStyle({ style: statusBar.style === 'DARK' ? Style.Dark : Style.Light });
}
```

:::

## Capacitor StatusBar

The `emit:capacitorStatusBar` task writes `state.outputs.capacitor.statusBar.backgroundColor` (the resolved `accent` role hex) and `statusBar.style` (`'DARK'` or `'LIGHT'` depending on the background luminance). Pass these directly to the Capacitor `StatusBar` plugin.

## On dynamic re-skinning

In v1, iridis re-derives one category palette per call. Calling `apply()` for different categories in sequence is supported — each call produces a new scoped stylesheet block. Multiple categories can coexist in the DOM simultaneously as long as they use distinct `data-category` attribute values.

Full living-color animation (smooth palette morphing between categories) is a v2 concern. See the [Living color thesis](/v2-living-color) for the vector-space framing and the planned `iridis-anima` plugin.
