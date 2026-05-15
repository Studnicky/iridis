<p align="center"><img src="docs/public/logo.png" alt="iridis" width="200" /></p>

# iridis

> Chromatic pipeline for dynamic palette derivation. Pluggable, OKLCH-native, contrast-enforced.

**You bring the colors you want to use and the role names your design system uses. iridis decides which color goes to which role so every accessibility constraint you declare is satisfied.**

`@studnicky/iridis` is the engine: a composition spine that turns variable-input-count seed colors into role-resolved palettes via a declared task pipeline. Zero runtime dependencies. Browser- and Node-safe. Outputs are not part of the engine. Every output target (CSS variables, Tailwind, VS Code themes, native chrome, RDF graphs) is a separate plugin you adopt at runtime.

The engine ships intake, clamp, resolve, expand, enforce, derive, and `emit:json` tasks plus 25 math primitives (OKLCH, HSL, sRGB, Display-P3, contrast models, CVD simulation, median-cut clustering). Math primitives are exported as direct singletons from `@studnicky/iridis`; import only what you need. Plugins register additional tasks via `engine.adopt(plugin)`. Cross-output runtime toggles (framing, color space, plugin extras) flow through a typed `state.runtime` slot read by every emitter.

## Documentation

The full documentation is published at **https://studnicky.github.io/iridis/**. The site runs the live engine against its own brand palette — every chrome and syntax token on the page is the output of `engine.run()`, so the docs themselves demonstrate what the library produces.

- [Getting started](https://studnicky.github.io/iridis/getting-started) - install, the smallest possible pipeline, the shape of the output.
- [Try it out](https://studnicky.github.io/iridis/try-it-out) - edit seed colors and a role schema in the browser; the page recomputes through the engine on every keystroke.
- [Pipeline](https://studnicky.github.io/iridis/concepts/pipeline) - how `Engine.adopt` + `pipeline()` + `run()` compose.
- [Role schemas](https://studnicky.github.io/iridis/concepts/role-schemas) - declarative role definitions, OKLCH envelopes, contrast pairs, the canonical 10-value `ColorIntentType` ontology.
- [ColorRecord](https://studnicky.github.io/iridis/concepts/color-record) - the monomorphic record shape every task reads and writes, including wide-gamut `displayP3` semantics.
- [Contrast](https://studnicky.github.io/iridis/concepts/contrast) and [Accessibility calculations](https://studnicky.github.io/iridis/concepts/accessibility-calculations) - WCAG 2.1 AA/AAA, APCA Lc targets, and CVD simulation against the four canonical color-vision-deficiency types.
- [Recipes](https://studnicky.github.io/iridis/recipes/cli) - end-to-end snippets for the CLI, cascading CSS variables, and the Vue + Capacitor sample app.
- [Reference](https://studnicky.github.io/iridis/reference/hex) - per-color-space pages (Hex, RGB, HSV, CMYK, OKLCH) and accessibility-standards pages (WCAG 2.1, APCA).

## Install

```bash
npm install @studnicky/iridis
```

## Hello, palette

```ts
import { Engine, coreTasks } from '@studnicky/iridis';

const engine = new Engine();
for (const task of coreTasks) engine.tasks.register(task);

engine.pipeline([
  'intake:any',
  'expand:family',
  'resolve:roles',
  'enforce:contrast',
  'derive:variant',
  'emit:json',
]);

const state = await engine.run({
  'colors':  ['#8B5CF6'],
  'roles':   yourRoleSchema,
  'runtime': { 'framing': 'dark' },
});

console.log(state.outputs['json']);
```

Need direct access to a math primitive? Import the singleton:

```ts
import { luminance, contrastWcag21, oklchToRgb } from '@studnicky/iridis';

const lum    = luminance.apply(record);
const ratio  = contrastWcag21.apply(foreground, background);
const purple = oklchToRgb.apply(0.62, 0.18, 290);
```

To target a specific output (CSS variables, Tailwind config, VS Code theme, etc.), `engine.adopt(...)` the corresponding plugin and add its emit task to the pipeline.

## Output plugins

Output adapters publish independently and have their own release cadence. Each implements `PluginInterface` and contributes its own emit task plus any output-specific math primitives. Repository layout under `packages/` is purely for monorepo development convenience; consumers install only what they need.

```bash
npm install @studnicky/iridis @studnicky/iridis-stylesheet
```

The full first-party plugin list (CSS, Tailwind, VS Code, image intake, contrast enforcement, Capacitor native chrome, RDF) is in [`docs/internal/architecture.md`](docs/internal/architecture.md). None of them are required for the engine to run.

## Status

v0.1, pre-publish. Core engine + canonical pipeline tasks + math primitives are stable and tested (117 tests, all passing). First-party output plugins are tracked separately. The [Living color thesis](docs/v2-living-color.md) outlines the v2 animation engine and reactive signal bindings planned for the next major version.

## Documentation

Full documentation is published at **https://studnicky.github.io/iridis/**. Source docs live in [`docs/`](docs/):

- [Getting started](docs/getting-started.md), one-liner and engine API walkthrough
- [Pipeline](docs/concepts/pipeline.md), how the engine runs (intake → resolve → enforce → emit)
- [Role schemas](docs/concepts/role-schemas.md), declare what a palette must satisfy
- [ColorRecord](docs/concepts/color-record.md), the canonical OKLCH-first color shape
- [Contrast](docs/concepts/contrast.md), WCAG 2.1 and APCA enforcement
- [Cascading tokens recipe](docs/recipes/cascading-tokens.md), the dogfood pattern this site runs on
- [Living color thesis](docs/v2-living-color.md), animation, reactivity, and palette state machines for v2

## License

MIT, see [LICENSE](LICENSE). Copyright 2026 Andrew Studnicky.

## Author

Andrew Studnicky. The iridis project grew from research into generative design systems, living color spaces, and dynamic palette derivation. Questions and contributions welcome at https://github.com/Studnicky/iridis.
