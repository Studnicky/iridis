# Getting started

iridis is a chromatic pipeline for dynamic palette derivation. You give it any number of seed colors in any common format. It runs them through a registered sequence of tasks — intake, role resolution, contrast enforcement, variant derivation, and emission — and returns a role-resolved palette plus whichever consumer-shaped outputs you asked for (CSS variables, Tailwind theme, VS Code theme, Capacitor native chrome, RDF graph, etc.).

The core ships with zero runtime dependencies. Each output target is a separate plugin package. Pluggable math primitives let you swap the color space without touching task code.

## Install

::: code-group

```bash [core only]
npm install @studnicky/iridis
```

```bash [stylesheet output]
npm install @studnicky/iridis @studnicky/iridis-stylesheet
```

```bash [W3C-conformant + Capacitor]
npm install \
  @studnicky/iridis \
  @studnicky/iridis-contrast \
  @studnicky/iridis-stylesheet \
  @studnicky/iridis-capacitor
```

:::

## Hello, palette

```ts
import { engine, mathBuiltins, coreTasks } from '@studnicky/iridis';
import { stylesheetPlugin } from '@studnicky/iridis-stylesheet';

for (const m of mathBuiltins) engine.math.register(m);
for (const t of coreTasks)    engine.tasks.register(t);
engine.adopt(stylesheetPlugin);

engine.pipeline([
  'intake:any',
  'expand:family',
  'resolve:roles',
  'enforce:contrast',
  'derive:variant',
  'emit:cssVars',
]);

const state = await engine.run({
  'colors':  ['#8B5CF6'],
  'roles':   yourRoleSchema,
  'metadata': { 'cssVarPrefix': '--c-' },
});

document.documentElement.style.cssText = state.outputs.cssVars.full;
```

## Two ways to run

iridis works as an NPM library AND as a CLI tool.

### As a library

Import `engine` (or `new Engine()` for isolation), register the core tasks and math primitives, `adopt()` the plugins you want, declare your `pipeline()` order, and call `run(input)`.

### As a CLI

Install `@studnicky/iridis-cli`, write a JSON config with `enable*` flags, and run:

```bash
iridis ./palette.config.json
```

Same engine, same plugins. The CLI dynamically imports only the plugins whose `enable*` flag is true. Use it in build scripts, CI, or one-off generation jobs.

See the sample config at [`examples/vue-capacitor/category-w3c.config.json`](https://github.com/Studnicky/iridis/blob/main/examples/vue-capacitor/category-w3c.config.json).

## Where next

- The [Living color thesis](./v2-living-color) — why this is built around vector-space animation and what comes after v1.
- [GitHub repository](https://github.com/Studnicky/iridis).
