# @studnicky/iridis-tailwind

Emits a Tailwind theme `colors` object, a v4 CSS-first companion sheet of
`--c-*` custom properties, and a ready-to-import `tailwind.config.js` source
string. Role names that match `<root>-<shade>` with a numeric Tailwind shade
(`accent-50`, `accent-100`, ..., `accent-950`) collapse into nested colour
objects automatically.

The theme JSON colours stay sRGB hex on every roundtrip. Tailwind v4 picks up
wide-gamut values through the companion CSS-vars sheet, which gains an
`@supports (color: color(display-p3 0 0 0))` sibling block whenever any role
carries a populated `displayP3` slot.

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
npm install @studnicky/iridis @studnicky/iridis-tailwind
```

## Usage

```ts
import type { RoleSchemaInterfaceType } from '@studnicky/iridis';

import { Engine, coreTasks } from '@studnicky/iridis';
import { tailwindPlugin }    from '@studnicky/iridis-tailwind';

export function generateTailwindTheme(roleSchema: RoleSchemaInterfaceType) {
  const engine = new Engine();
  for (const task of coreTasks) engine.tasks.register(task);
  engine.adopt(tailwindPlugin);

  engine.pipeline([
    'intake:any',
    'resolve:roles',
    'expand:family',
    'enforce:contrast',
    'derive:variant',
    'emit:tailwindTheme',
  ]);

  const state = engine.run({
    'bypass':   undefined,
    'colors':   ['#8B5CF6'],
    'contrast': {
      'algorithm':  'wcag21',
      'cvdCorrect': undefined,
      'extra':      undefined,
      'level':      'AA',
    },
    'emit':      undefined,
    'maxColors': undefined,
    'metadata':  { 'cssVarPrefix': '--c-' },
    'roles':     roleSchema,
    'runtime':   undefined,
  });

  const out = state.outputs['tailwind:theme']!;
  // out.colors  : { accent: { 50: '#...', ... }, text: '#...', background: '#...' }
  // out.cssVars : ':root { --c-accent: #...; ... }' + optional @supports P3 block
  // out.config  : 'export default { theme: { extend: { colors: { ... } } } };'

  return out;
}
```

`state.outputs['tailwind:theme']` is typed as `TailwindOutputInterfaceType`:

| Field | Shape | Notes |
|---|---|---|
| `colors` | `Record<string, string \| Record<string, string>>` | Hex strings, with shade-grouping. sRGB-safe on every entry. |
| `cssVars` | `string` | `:root { ... }` block of `--c-*` vars. Gains a sibling `@supports display-p3` block when any role carries `displayP3`. |
| `config` | `string` | Source of a `tailwind.config.js` whose `theme.extend.colors` is the `colors` object above. |

Write `out.config` to `tailwind.config.js` for the v3 workflow; inline `out.cssVars`
above your `@theme` block for v4. Both layers consume the same role names.

Part of [iridis](https://github.com/Studnicky/iridis).
