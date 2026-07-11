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
