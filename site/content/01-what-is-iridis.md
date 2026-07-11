---
title: 1. What is Iridis
description: A chromatic pipeline that turns seed colors into a contrast-enforced palette in one line.
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
