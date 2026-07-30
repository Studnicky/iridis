# @studnicky/iridis-mui

Emits an MUI `createTheme()`-compatible palette object from resolved roles.
Builds `primary`/`secondary`/`error`/`warning`/`info`/`success` palette
families (each MUI's `{ main, light, dark, contrastText }` shape),
`background`, `text`, and `mode`, all read from the same resolved `state.roles`
every other plugin reads.

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
npm install @studnicky/iridis @studnicky/iridis-mui
```

## Usage

```ts
import type { RoleSchemaInterfaceType } from '@studnicky/iridis';

import { Engine, coreTasks } from '@studnicky/iridis';
import { muiPlugin }         from '@studnicky/iridis-mui';

export function generateMuiTheme(roleSchema: RoleSchemaInterfaceType) {
  const engine = new Engine();
  for (const task of coreTasks) engine.tasks.register(task);
  engine.adopt(muiPlugin);

  engine.pipeline([
    'intake:any',
    'resolve:roles',
    'expand:family',
    'enforce:contrast',
    'derive:variant',
    'emit:muiTheme',
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
    'metadata':  undefined,
    'roles':     roleSchema,
    'runtime':   { 'colorSpace': undefined, 'extra': undefined, 'framing': 'dark' },
  });

  const out = state.outputs['mui:theme']!;
  // out.palette : { primary: { main, light, dark, contrastText }, secondary: {...}, background: {...}, text: {...}, mode: 'dark' }
  // out.config  : "export default {\n  palette: {...},\n};"

  return out;
}
```

`state.outputs['mui:theme']` is typed as `MuiOutputInterfaceType`:

| Field | Shape | Notes |
|---|---|---|
| `palette` | `Record<string, JsonValueType>` | The built `createTheme()` palette object. |
| `config` | `string` | Source of an `export default { palette: {...} };` module, ready to spread into `createTheme()`. |

## Role mapping

| MUI palette key | Role | Fallback role |
|---|---|---|
| `primary` | `brand` | -- |
| `secondary` | `accent-alt` | `brand` |
| `error` | `error` | -- |
| `warning` | `warning` | `brand` |
| `info` | `info` | `brand` |
| `success` | `success` | `brand` |
| `background.default` | `background` | -- |
| `background.paper` | `surface` | `bg-soft`, then `background` |
| `text.primary` | `text` | -- |
| `text.secondary` | `text-subtle` | `muted`, then `text` |

`mode` is read from `state.runtime.framing`, defaulting to `'light'` when
unset.

Each palette family is omitted entirely when its base role is absent -- MUI
expects a family to be either fully present or omitted, never partially
populated with guessed values. `contrastText` reads the paired `on-<role>`
role (e.g. `on-brand`) when present, falling back to `roles.text`, then
`'#ffffff'`.

`light`/`dark` shade steps prefer `state.variants.s300` and
`state.variants.s700` for the role when present -- register a
`metadata['core:variantConfig']` entry naming `s300` and/or `s700` variants
to supply your own. Otherwise they're derived directly from the role's own
color via `lighten(main, 0.2)` / `darken(main, 0.3)` (OKLCH lightness,
matching MUI's own `createPalette` tonal-offset convention), so shades are
always distinct under the default pipeline with no extra configuration.

Part of [iridis](https://github.com/Studnicky/iridis).
