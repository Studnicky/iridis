---
layout: doc
title: iridis
---

<div style="padding:1.5rem 0 2rem;border-bottom:1px solid var(--vp-c-divider);margin-bottom:2rem">
  <h1 style="font-size:2.4rem;font-weight:700;letter-spacing:-0.02em;margin:0 0 0.4rem;border:0;padding:0;background:linear-gradient(90deg,#7c3aed 0%,#2563eb 33%,#10b981 66%,#ec4899 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent">iridis</h1>
  <p style="font-size:1.15rem;color:var(--vp-c-text-2);max-width:640px;margin:0 0 1.25rem">Chromatic pipeline for dynamic palette derivation. Pluggable, OKLCH-native, contrast-enforced. Seeds in, role-resolved palettes out.</p>
  <div style="display:flex;gap:0.75rem;flex-wrap:wrap">
    <a href="/iridis/getting-started" class="VPButton medium brand" style="text-decoration:none;padding:0.5rem 1.25rem;border-radius:4px;background:var(--vp-button-brand-bg);color:var(--vp-button-brand-text);font-weight:500">Get started</a>
    <a href="/iridis/concepts/pipeline" class="VPButton medium alt" style="text-decoration:none;padding:0.5rem 1.25rem;border-radius:4px;background:var(--vp-button-alt-bg);color:var(--vp-button-alt-text);font-weight:500">Pipeline</a>
    <a href="/iridis/v2-living-color" class="VPButton medium alt" style="text-decoration:none;padding:0.5rem 1.25rem;border-radius:4px;background:var(--vp-button-alt-bg);color:var(--vp-button-alt-text);font-weight:500">Living color (v2 thesis)</a>
    <a href="https://github.com/Studnicky/iridis" class="VPButton medium alt" style="text-decoration:none;padding:0.5rem 1.25rem;border-radius:4px;background:var(--vp-button-alt-bg);color:var(--vp-button-alt-text);font-weight:500">GitHub</a>
  </div>
</div>

`@studnicky/iridis` is a composition engine for generating design system palettes from seed colors. Provide any number of seed colors in any common format. The engine runs them through a registered pipeline — intake, role resolution, contrast enforcement, variant derivation — and emits role-resolved palettes. Output adapters (CSS variables, Tailwind, VS Code semantic tokens, native chrome, RDF graphs) are separate plugins. The engine ships with zero runtime dependencies.

::: tip Live demo
Open the **Configure docs** accordion in the sidebar to set your seed colors, framing, and contrast targets. Every demo on this site re-runs as you change them, and the docs theme itself recomputes from your seeds via iridis.
:::

## Live: full pipeline

This demo runs the canonical pipeline end-to-end against your sidebar config: intake → clamp → resolve roles → expand → enforce contrast → derive variants.

<IridisDemo
  :pipeline="['intake:hex', 'clamp:count', 'resolve:roles', 'expand:family', 'enforce:contrast', 'derive:variant', 'emit:json']"
  :show-json="true"
/>

<IridisCode label="Code behind this demo">

```ts
import { Engine, mathBuiltins, coreTasks } from '@studnicky/iridis';

const engine = new Engine();
for (const m of mathBuiltins) engine.math.register(m);
for (const t of coreTasks)    engine.tasks.register(t);

engine.pipeline([
  'intake:hex',
  'clamp:count',
  'resolve:roles',
  'expand:family',
  'enforce:contrast',
  'derive:variant',
  'emit:json',
]);

const state = await engine.run({
  'colors':   ['#7c3aed', '#06b6d4', '#10b981', '#ec4899'],
  'roles':    minimalRoleSchema,
  'contrast': { 'level': 'AA', 'algorithm': 'wcag21' },
  'runtime':  { 'framing': 'dark', 'colorSpace': 'srgb' },
});

console.log(state.outputs.json);
```

</IridisCode>

## What it does

- **Variable input.** 1 to N seed colors in any format (hex, rgb, hsl, oklch, lab, named, image pixels). Intake adapters normalize to a canonical OKLCH-first record.
- **Role-resolved.** Roles are consumer-defined JSON Schema. The engine assigns colors to roles, expands missing roles parametrically, enforces contrast pairs, and emits role-shaped output.
- **Pluggable everything.** Math primitives, intake formats, transforms, and emitters are all registered domain modules. Swap `mixOklch` for a perceptual mixer, register a custom emitter, compose your own pipeline.
- **Contrast-enforced.** WCAG 2.1, APCA, and CVD simulation as registered tasks. Pairs that fail thresholds are nudged in OKLCH space until they pass — every frame, if you want.
- **Browser- and Node-safe.** Core has zero runtime dependencies. Plugins own their deps. Tree-shake or run as CLI; same engine either way.
- **Living color (coming).** Treat a palette as a vector and animate trajectories through OKLCH × N-roles space. Chameleons and chromatophores for your UI.

## Where to look next

- [Getting started](./getting-started) — install and first run
- [Pipeline](./concepts/pipeline) — task names, ordering, contracts
- [Role schemas](./concepts/role-schemas) — define what a palette must satisfy
- [CLI recipe](./recipes/cli) — JSON config to filesystem outputs
- [Living color (v2 thesis)](./v2-living-color) — animation engine and reactive bindings planned next
