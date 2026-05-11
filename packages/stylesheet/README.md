# @studnicky/iridis-stylesheet

Emits CSS custom properties with `prefers-color-scheme`, `forced-colors`, and `display-p3` wide-gamut blocks. Drop the output into a `<style>` tag.

## Install

```bash
npm install @studnicky/iridis @studnicky/iridis-stylesheet
```

## Usage

```ts
import { engine } from '@studnicky/iridis';
import { stylesheetPlugin } from '@studnicky/iridis-stylesheet';

engine.adopt(stylesheetPlugin);
engine.pipeline(['intake:any', 'resolve:roles', 'emit:cssVars']);

const state = await engine.run({
  colors: ['#8B5CF6'],
  metadata: { cssVarPrefix: '--color-' },
});

const css = (state.outputs.cssVars as { full: string }).full;
// :root { --color-accent: #...; --color-text: #...; }
// @media (prefers-color-scheme: dark) { ... }
// @supports (color: color(display-p3 1 0 0)) { ... }
```

The plugin generates a single stylesheet covering light/dark variants, forced-colors mode, and P3 wide-gamut fallbacks. Ready to inline or serve as an external asset.

Part of [iridis](https://github.com/Studnicky/iridis).
