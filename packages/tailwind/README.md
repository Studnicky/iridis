# @studnicky/iridis-tailwind

Emits a Tailwind theme `colors` object, a v4 CSS-first companion sheet of
`--c-*` custom properties, and a ready-to-import `tailwind.config.js` source
string. Role names that match `<root>-<shade>` with a numeric Tailwind shade
(`accent-50`, `accent-100`, ..., `accent-950`) collapse into nested colour
objects automatically.

The theme JSON colours stay sRGB hex on every roundtrip — Tailwind v4 picks up
wide-gamut values through the companion CSS-vars sheet, which gains an
`@supports (color: color(display-p3 0 0 0))` sibling block whenever any role
carries a populated `displayP3` slot.

## Install

```bash
npm install @studnicky/iridis @studnicky/iridis-tailwind
```

## Usage

```ts
import { Engine, coreTasks } from '@studnicky/iridis';
import { tailwindPlugin }    from '@studnicky/iridis-tailwind';

const engine = new Engine();
for (const task of coreTasks) engine.tasks.register(task);
engine.adopt(tailwindPlugin);

engine.pipeline([
  'intake:any',
  'expand:family',
  'resolve:roles',
  'enforce:contrast',
  'derive:variant',
  'emit:tailwindTheme',
]);

const state = await engine.run({
  'colors':   ['#8B5CF6'],
  'roles':    yourRoleSchema,
  'contrast': { 'level': 'AA' },
  'metadata': { 'cssVarPrefix': '--c-' },
});

const out = state.outputs['tailwind']!;
// out.colors  : { accent: { 50: '#...', ... }, text: '#...', background: '#...' }
// out.cssVars : ':root { --c-accent: #...; ... }' + optional @supports P3 block
// out.config  : 'export default { theme: { extend: { colors: { ... } } } };'
```

`state.outputs['tailwind']` is typed as `TailwindOutputInterface`:

| Field | Shape | Notes |
|---|---|---|
| `colors` | `Record<string, string \| Record<string, string>>` | Hex strings, with shade-grouping. sRGB-safe on every entry. |
| `cssVars` | `string` | `:root { ... }` block of `--c-*` vars. Gains a sibling `@supports display-p3` block when any role carries `displayP3`. |
| `config` | `string` | Source of a `tailwind.config.js` whose `theme.extend.colors` is the `colors` object above. |

Write `out.config` to `tailwind.config.js` for the v3 workflow; inline `out.cssVars`
above your `@theme` block for v4. Both layers consume the same role names.

Part of [iridis](https://github.com/Studnicky/iridis).
