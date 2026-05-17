---
title: Image to theme
description: Drop a picture, A/B median-cut vs delta-E clustering, and the extracted palette themes every page of the docs.
---

# Image → theme

Drop or paste an image below. The pipeline histograms the pixels, clusters them into K dominant colors with your choice of algorithm, maps them to roles, enforces contrast, and re-themes the docs — every page on the site reacts to the result.

<ImageToTheme />

## Resolved roles

<BuildResolvedRoles />

## How it works

```
intake:imagePixels   →   ImageData → ColorRecord per pixel
gallery:histogram    →   5-bpc histogram → weighted bin records
gallery:extract      →   reduce to K dominant colors (algorithm-switchable)
gallery:assignRoles  →   map dominant colors to canvas/frame/accent/muted/text
gallery:harmonize    →   shift accent if too close to frame (deltaE < threshold)
resolve:roles        →   apply role schema constraints
enforce:contrast     →   nudge until every declared pair satisfies WCAG AA
derive:variant       →   compute dark + light siblings
emit:json            →   flatten to hex strings
```

The sliders above expose K, histogram bits-per-channel, delta-E input cap, harmonize threshold, and lightness/chroma range filters; every change re-runs the pipeline and re-themes the docs.

## Use the pipeline in your own code

```ts
import { Engine, coreTasks }               from '@studnicky/iridis';
import { contrastPlugin }                  from '@studnicky/iridis-contrast';
import { imagePlugin, galleryRoleSchema5 } from '@studnicky/iridis-image';

const engine = new Engine();
for (const t of coreTasks) engine.tasks.register(t);
engine.adopt(contrastPlugin);
engine.adopt(imagePlugin);

engine.pipeline([
  'intake:imagePixels',
  'gallery:histogram',
  'gallery:extract',
  'gallery:assignRoles',
  'gallery:harmonize',
  'resolve:roles',
  'enforce:contrast',
  'derive:variant',
  'emit:json',
]);

const state = await engine.run({
  'colors':   [imageData],
  'roles':    galleryRoleSchema5,
  'contrast': { 'level': 'AA' },
  'metadata': { 'gallery': { 'k': 6, 'algorithm': 'delta-e' } },
});

const palette = state.outputs['json']!.roles;
```

→ Prefer a hex / RGB / OKLCH picker? See **[Try it out](./try-it-out)**. <br />
→ Want every knob in one place? Open **[Build](./build)**.
