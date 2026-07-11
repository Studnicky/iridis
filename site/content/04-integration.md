---
title: 4. Seamless Integration
description: Adopt Iridis into an existing codebase without changing your existing utility classes or CSS component styles.
---

Integrating Iridis into an existing application shouldn't require rewriting all of your CSS or switching out your Tailwind classes. Consumers can adopt Iridis effortlessly by presenting their existing color tokens and mapping them directly to the variables Iridis outputs. 

Your goal is to configure Iridis to target the CSS Custom Properties (variables) your app already uses.

## The Strategy: CSS Variable Mapping

Most modern UI frameworks (like Tailwind CSS, Nuxt UI, Shadcn, MUI, or Bootstrap) rely on CSS variables under the hood. If your app already uses classes like `text-primary` or `bg-surface`, those are typically backed by a variable like `--color-primary` or `--surface`.

Instead of replacing `text-primary` with something else, you simply **tell Iridis to overwrite `--color-primary`**. 

There are two primary ways to do this:

### 1. Direct Alignment (Emit Custom Keys)

If your existing application expects variables named `--brand-main`, `--bg-base`, and `--text-body`, you can define an Iridis Role Schema that exactly matches those names. Iridis's `emit:cssVars` (from `@studnicky/iridis-stylesheet`) will generate the CSS using those exact keys.

```ts
import { Engine } from '@studnicky/iridis';

const schema = {
  roles: [
    { name: 'brand-main', /* ... */ },
    { name: 'bg-base', /* ... */ },
    { name: 'text-body', /* ... */ }
  ]
};

// ... engine setup ...
const state = await engine.run({
  colors: ['#00FF00', '#FF0000'],
  roles: schema
});

// Outputs:
// :root {
//   --brand-main: #...;
//   --bg-base: #...;
//   --text-body: #...;
// }
```

When you inject this generated CSS into your `<head>`, your existing CSS and components will instantly react to the new scheme without a single code change.

### 2. The `{ key: val }` Alias Map

If you prefer to use the standard Iridis schema (which handles complex contrast logic seamlessly for roles like `background`, `brand`, `text`, etc.) but need it to interface with your existing variables, you can simply write a CSS mapping block.

Generate the standard Iridis CSS variables, and then map your app's variables to point to them:

```css
/* Your app's existing theme file */
:root {
  /* Map your existing tokens to Iridis's outputs */
  --color-primary: var(--iridis-brand);
  --color-primary-hover: var(--iridis-brand-600);
  
  --bg-surface: var(--iridis-background);
  --text-main: var(--iridis-text);
  
  --border-color: var(--iridis-muted);
}
```

With this single mapping block, the entire Iridis pipeline (including contrast checking and synthesis) powers your existing UI, guaranteeing that your application remains fully responsive to any palette change.

## Recipe: Vue + Capacitor per-category palettes

A worked example of the mapping strategy above: `examples/vue-capacitor/categoryColorService.ts` is a service that takes a category name and a seed hex color, runs the Iridis pipeline, writes scoped CSS custom properties to the document, and returns Capacitor `StatusBar` parameters for native chrome.

`CategoryColorService` is a singleton that owns a single `Engine` instance configured at construction time. The engine is set up once; individual calls to `apply(category, seed)` just invoke `engine.run()` with a new input.

```ts
import { Engine, coreTasks } from '@studnicky/iridis';
import { contrastPlugin }   from '@studnicky/iridis-contrast';
import { stylesheetPlugin } from '@studnicky/iridis-stylesheet';
import { capacitorPlugin }  from '@studnicky/iridis-capacitor';
import { categoryW3cRoleSchema } from './categoryW3cRoleSchema.ts';

export class CategoryColorService {
  private readonly engine: Engine;

  private constructor() {
    this.engine = new Engine();

    for (const task of coreTasks) this.engine.tasks.register(task);

    this.engine.adopt(contrastPlugin);
    this.engine.adopt(stylesheetPlugin);
    this.engine.adopt(capacitorPlugin);

    this.engine.pipeline([
      'intake:any',
      'resolve:roles',
      'expand:family',
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

The `private constructor` + `static shared()` pattern wires the engine once. Each service owns its own `Engine` instance and therefore its own isolated `TaskRegistry`, which matters when multiple services in the same application need different pipeline configurations.

### From seed to palette

Using seed `#8B5CF6` (a mid-purple, high chroma) against `categoryW3cRoleSchema`: `intake:any` parses the hex and converts it to OKLCH (approximately L=0.62, C=0.27, H=293). `resolve:roles` assigns it to the `accent` role; `canvas`, `surface`, and `text` receive the same seed as their only candidate, but their `lightnessRange` constraints push them to their range centers during `expand:family`'s second pass. `enforce:wcagAA` then checks all four contrast pairs in the schema and nudges foreground roles until each pair meets 4.5:1 (text) or 3.0:1 (border).

`emit:cssVars` writes `state.outputs['stylesheet:cssVars']` with three shapes: `full` (a single CSS string with all custom properties), `scopedBlock` (a scoped `[data-category="music"] { ... }` block), and `map` (a `Record<string, string>` of property name to value). `emit:capacitorStatusBar` writes `state.outputs['capacitor:statusBar']`, and `emit:capacitorTheme` writes `state.outputs['capacitor:theme']`.

### Applying CSS variables dynamically

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

  const cssVars   = state.outputs['stylesheet:cssVars'];
  const statusBar = state.outputs['capacitor:statusBar'];

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

  return { cssVars, statusBar };
}
```

Any component that sets `data-category="music"` on its root element automatically picks up the derived palette via CSS custom property inheritance.

### Vue 3 SFC integration

```vue
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
