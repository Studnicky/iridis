# @studnicky/iridis-image

Reduces image pixels to a representative palette via median-cut clustering
(`gallery:extract`), assigns the dominant colours to the shipped 5-role
gallery schema (`gallery:assignRoles`), and optionally harmonises the role
hues toward a target (`gallery:harmonize`). Pair with browser canvas pixel
sampling: feed raw `{ r, g, b }` triples or hex strings through `intake:any`
and let the gallery tasks do the rest.

## Install

```bash
npm install @studnicky/iridis @studnicky/iridis-image
```

## Usage

```ts
import { Engine, coreTasks } from '@studnicky/iridis';
import {
  imagePlugin,
  galleryRoleSchema5,
} from '@studnicky/iridis-image';

const engine = new Engine();
for (const task of coreTasks) engine.tasks.register(task);
engine.adopt(imagePlugin);

engine.pipeline([
  'intake:any',
  'gallery:extract',
  'gallery:assignRoles',
  'gallery:harmonize',
  'resolve:roles',
  'enforce:contrast',
  'derive:variant',
  'emit:json',
]);

const pixels = sampleCanvasPixels(imageElement);
// pixels is a flat readonly array of hex strings (or rgb / oklch objects).

const state = await engine.run({
  'colors':   pixels,
  'roles':    galleryRoleSchema5,
  'contrast': { 'level': 'AA' },
  'metadata': { 'gallery': { 'k': 5 } },
});

const out = state.outputs['json']!;
// out.colors:   readonly hex[]
// out.roles:    Record<string, string> — gallery canvas / frame / accent / muted / text
// out.variants: Record<string, Record<string, string>> — dark / light by default
```

## Tasks

| Name | Reads | Writes |
|---|---|---|
| `gallery:extract` | `colors`, `metadata.gallery.k` | replaces `state.colors` with the K dominant colours via `clusterMedianCut`; records `metadata.gallery.dominantColors`. |
| `gallery:assignRoles` | dominant colours + the gallery role schema | seeds `state.roles` so `resolve:roles` has a starting assignment. |
| `gallery:harmonize` | resolved roles + optional `metadata.gallery.harmonizeHue` | shifts each role's hue toward a target while preserving lightness / chroma; logs the average `deltaE` in `metadata.gallery.harmonizeDetails`. |

The shipped `galleryRoleSchema5` (canvas, frame, accent, muted, text) targets
WCAG AA / AAA across the three required pairs (`text/canvas` 7:1,
`text/frame` 4.5:1, `accent/canvas` 3:1) and ships as a strict-typed
`RoleSchemaInterface` instance.

Part of [iridis](https://github.com/Studnicky/iridis).
