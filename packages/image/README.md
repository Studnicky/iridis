# @studnicky/iridis-image

Reduces image pixels to a representative palette via median-cut clustering, then assigns to a 5-role gallery schema. Pair with browser canvas pixel sampling.

## Install

```bash
npm install @studnicky/iridis @studnicky/iridis-image
```

## Usage

```ts
import { engine } from '@studnicky/iridis';
import { imagePlugin } from '@studnicky/iridis-image';

engine.adopt(imagePlugin);
engine.pipeline(['intake:image', 'reduce:palette', 'resolve:roles', 'emit:json']);

const pixels = await getCanvasPixels(imageElement);
const state = await engine.run({
  input: pixels,
  roles: your5RoleSchema,
});

console.log(state.palette);
```

The plugin uses median-cut clustering to extract the dominant colors from an image, then fits them to a 5-role palette (primary, accent, success, warning, danger). Useful for extracting palettes from brand assets or user-supplied imagery.

Part of [iridis](https://github.com/Studnicky/iridis).
