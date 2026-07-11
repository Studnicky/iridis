---
title: 1. Getting Started
description: Install @studnicky/iridis and derive a contrast-enforced palette in one line or wire up the engine directly.
---

iridis is a chromatic pipeline for dynamic palette derivation. You give it seed colors (hex, RGB, OKLCH, etc.). It runs them through a registered sequence of tasks—intake, role resolution, contrast enforcement, variant derivation, and emission—and returns a role-resolved palette plus any consumer-shaped outputs you requested (CSS variables, Tailwind, Shadcn, MUI, Capacitor, etc.).

The core (`@studnicky/iridis`) ships with zero runtime dependencies. Each output target is a separate plugin package.

## Installation

Install the core package, plus any output plugins you need. 

```bash
# Core only
npm install @studnicky/iridis

# W3C contrast checking + Stylesheet + Shadcn UI outputs
npm install @studnicky/iridis \
  @studnicky/iridis-contrast \
  @studnicky/iridis-stylesheet \
  @studnicky/iridis-shadcn
```

## The simplest call (`quickPalette`)

For basic use cases, you don't even need to configure an engine. Use the `quickPalette` helper:

```ts
import { quickPalette } from '@studnicky/iridis';

const palette = await quickPalette(['#7c3aed', '#06b6d4'], 'dark');
// → { background: '#07061a', foreground: '#f0f0ff', accent: '#7c3aed', muted: '#7e7e9a' }
```

One import, one call. No schema to define, no pipeline to declare. The framing argument (`'dark'` or `'light'`) picks the clamp envelopes, and everything else uses sensible defaults.

## Long-form Engine API

When you need custom schemas, explicit contrast checking, or plugin emitters, construct the `Engine` directly.

```ts
import { Engine, coreTasks }  from '@studnicky/iridis';
import { stylesheetPlugin }   from '@studnicky/iridis-stylesheet';
import { shadcnPlugin }       from '@studnicky/iridis-shadcn';

const engine = new Engine();
// Register core tasks
for (const task of coreTasks) engine.tasks.register(task);

// Adopt output plugins
engine.adopt(stylesheetPlugin);
engine.adopt(shadcnPlugin);

// Declare the execution sequence
engine.pipeline([
  'intake:any',
  'expand:family',
  'resolve:roles',
  'enforce:contrast',
  'derive:variant',
  'emit:cssVars',
  'emit:shadcnVars'
]);

// Run the pipeline
const state = await engine.run({
  colors: ['#8B5CF6'],
  roles: yourRoleSchema,
  contrast: { level: 'AA' },
});

// The results are available in state.outputs
console.log(state.outputs['stylesheet:cssVars']);
```

## Math primitives

iridis exports every internal colour-math primitive as a singleton class. If you only need to calculate WCAG contrast or convert OKLCH to RGB, you can import them directly without touching the pipeline:

```ts
import { luminance, contrastWcag21, oklchToRgb } from '@studnicky/iridis';

const ratio = contrastWcag21.apply(foreground, background);
const rgb = oklchToRgb.apply(0.62, 0.18, 290);
```
