# @studnicky/iridis-image

Reduces image pixels to a representative palette via median-cut clustering
(`gallery:extract`), assigns the dominant colours to the shipped 5-role
gallery schema (`gallery:assignRoles`), and optionally shifts the accent hue
away from the frame when their ΔE2000 distance is below the configured
threshold (`gallery:harmonize`). Pair with browser canvas pixel sampling: feed
raw `{ r, g, b }` triples or hex strings through `intake:any` and let the
gallery tasks do the rest.

## Install

GitHub Packages requires a personal access token (classic) with
`read:packages`; the token's account must also have read access to this
package's repository. Expose the token as `NODE_AUTH_TOKEN`, then configure
the `@studnicky` scope before installing:

```ini
# ~/.npmrc
@studnicky:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```bash
npm install @studnicky/iridis @studnicky/iridis-image
```

## Usage

```ts
import type { InputInterface } from '@studnicky/iridis';

import { Engine, coreTasks } from '@studnicky/iridis';
import {
  imagePlugin,
  galleryRoleSchema5,
} from '@studnicky/iridis-image';

export function generateGalleryTheme(pixels: InputInterface['colors']) {
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

  const state = engine.run({
    'bypass':   undefined,
    'colors':   pixels,
    'contrast': {
      'algorithm':  'wcag21',
      'cvdCorrect': undefined,
      'extra':      undefined,
      'level':      'AA',
    },
    'emit':      undefined,
    'maxColors': undefined,
    'metadata':  { 'gallery': { 'k': 5 } },
    'roles':     galleryRoleSchema5,
    'runtime':   undefined,
  });

  const out = state.outputs['core:json']!;
  const dominantColors = state.metadata['gallery:dominantColors'];
  const harmonizeDetails = state.metadata['gallery:harmonizeDetails'];
  // out.colors:        readonly hex[]
  // out.roles:         Record<string, string> // gallery canvas / frame / accent / muted / text
  // out.variants:      Record<string, Record<string, string>> // dark / light by default
  // dominantColors:    the representative ColorRecord values selected by gallery:extract
  // harmonizeDetails:  { before, after, deltaE, hueShift } when gallery:harmonize shifts accent

  return { dominantColors, harmonizeDetails, out };
}
```

## Tasks

| Name | Reads | Writes |
|---|---|---|
| `gallery:extract` | `colors`, `metadata.gallery.k` | Replaces `state.colors` with the K dominant colours and records `state.metadata['gallery:dominantColors']`. |
| `gallery:assignRoles` | dominant colours + the gallery role schema | seeds `state.roles` so `resolve:roles` has a starting assignment. |
| `gallery:harmonize` | resolved `accent` / `frame` roles + optional `metadata.gallery.harmonizeThreshold` | When ΔE2000 is below the threshold, shifts the accent hue 30° away from the frame and records `state.metadata['gallery:harmonizeDetails']`. |

The shipped `galleryRoleSchema5` (canvas, frame, accent, muted, text) targets
WCAG AA / AAA across the three required pairs (`text/canvas` 7:1,
`text/frame` 4.5:1, `accent/canvas` 3:1) and ships as a strict-typed
`RoleSchemaInterfaceType` instance.

Part of [iridis](https://github.com/Studnicky/iridis).
