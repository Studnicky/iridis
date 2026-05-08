# @studnicky/iridis-contrast

Enforces WCAG 2.1 / AAA contrast thresholds, APCA Lc, and Brettel-Viénot CVD simulation. Iterates OKLCH lightness until target ratios are met.

## Install

```bash
npm install @studnicky/iridis @studnicky/iridis-contrast
```

## Usage

```ts
import { engine } from '@studnicky/iridis';
import { contrastPlugin } from '@studnicky/iridis-contrast';

engine.adopt(contrastPlugin);
engine.pipeline(['intake:any', 'resolve:roles', 'enforce:contrast', 'emit:json']);

const state = await engine.run({
  colors: ['#8B5CF6'],
  contrast: { standard: 'wcag-aa', cvdMode: 'deuteranopia' },
});

console.log(state.palette);
```

The plugin adjusts OKLCH lightness iteratively to meet specified contrast ratios against background colors, optionally simulating color vision deficiency (Deuteranopia, Protanopia, Tritanopia) to ensure readability across all viewers. Supports WCAG AA, WCAG AAA, and APCA Lc standards.

Part of [iridis](https://github.com/Studnicky/iridis).
