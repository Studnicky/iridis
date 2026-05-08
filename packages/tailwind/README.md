# @studnicky/iridis-tailwind

Emits a Tailwind theme object plus a v4 CSS-first companion sheet. Shade-grouped role names (`accent-50`, `accent-100`, ...) collapse into nested color objects.

## Install

```bash
npm install @studnicky/iridis @studnicky/iridis-tailwind
```

## Usage

```ts
import { engine } from '@studnicky/iridis';
import { tailwindPlugin } from '@studnicky/iridis-tailwind';

engine.adopt(tailwindPlugin);
engine.pipeline(['intake:any', 'resolve:roles', 'emit:tailwind']);

const state = await engine.run({
  colors: ['#8B5CF6'],
  roles: yourRoleSchema,
});

const theme = state.outputs.tailwind;
// { accent: { 50: '#...', 100: '#...', ... }, ... }
```

Use the theme object in `tailwind.config.js`. For Tailwind v4 (CSS-first), the plugin also outputs a companion stylesheet with `@layer theme` declarations.

Part of [iridis](https://github.com/Studnicky/iridis).
