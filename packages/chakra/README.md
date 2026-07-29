# @studnicky/iridis-chakra

Emits a Chakra UI `extendTheme()`-compatible color-token scale from resolved
roles and their `dark`/`light` variants. Each Chakra color family (`brand`,
`accent`, `success`, `warning`, `error`, `info`, `neutral`) is built from a
role name with an optional fallback role consulted when the primary role
never resolves, so a single role schema can drive this plugin without every
schema declaring every Chakra-named role.

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
npm install @studnicky/iridis @studnicky/iridis-chakra
```

## Usage

```ts
import type { RoleSchemaInterfaceType } from '@studnicky/iridis';

import { Engine, coreTasks } from '@studnicky/iridis';
import { chakraPlugin }      from '@studnicky/iridis-chakra';

export function generateChakraTheme(roleSchema: RoleSchemaInterfaceType) {
  const engine = new Engine();
  for (const task of coreTasks) engine.tasks.register(task);
  engine.adopt(chakraPlugin);

  engine.pipeline([
    'intake:any',
    'resolve:roles',
    'expand:family',
    'enforce:contrast',
    'derive:variant',
    'emit:chakraTheme',
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
    'runtime':   undefined,
  });

  const out = state.outputs['chakra:theme']!;
  // out.colors : { brand: { '100': '#...', '500': '#...', '900': '#...' }, accent: { ... }, ... }
  // out.config : "import { extendTheme } from '@chakra-ui/react';\n\nexport default extendTheme({\n  colors: {...},\n});"

  return out;
}
```

`state.outputs['chakra:theme']` is typed as `ChakraOutputInterfaceType`:

| Field | Shape | Notes |
|---|---|---|
| `colors` | `Record<string, Record<string, string>>` | Family name to `{ '100': hex, '500': hex, '900': hex }`. A family is omitted entirely when none of its tiers resolve. |
| `config` | `string` | Source of an `extendTheme({ colors: ... })` module, ready to import into a Chakra theme setup. |

## Colour families

| Chakra family | Primary role | Fallback role |
|---|---|---|
| `brand` | `brand` | -- |
| `accent` | `accent-alt` | `brand` |
| `success` | `success` | `brand` |
| `warning` | `warning` | `brand` |
| `error` | `error` | -- |
| `info` | `info` | `brand` |
| `neutral` | `muted` | `text` |

## Tiers

The engine has no numeric-shade generator (no `s50`..`s900` scale); the only
per-role colour data available is the canonical resolved role
(`state.roles`) and the `dark`/`light` variants `derive:variant` produces.
`emit:chakraTheme` maps those three sources onto a minimal three-tier scale:

| Tier | Source |
|---|---|
| `100` | `state.variants.light` |
| `500` | `state.roles` (the canonical resolution) |
| `900` | `state.variants.dark` |

A tier is omitted from a family when its source has no colour for the role,
rather than backfilled from another tier.

Part of [iridis](https://github.com/Studnicky/iridis).
