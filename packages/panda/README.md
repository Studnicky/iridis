# @studnicky/iridis-panda

Emits a Panda CSS token config and a companion UnoCSS-compatible theme object
from the same resolved-role colour map. Both frameworks consume the same
flat semantic token set (`primary`, `secondary`, `background`, `surface`,
`text`, `textMuted`, `border`, `success`, `warning`, `error`, `info`), each
resolved from `state.roles` through an ordered candidate chain so a single
role schema can drive both outputs.

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
npm install @studnicky/iridis @studnicky/iridis-panda
```

## Usage

```ts
import type { RoleSchemaInterfaceType } from '@studnicky/iridis';

import { Engine, coreTasks } from '@studnicky/iridis';
import { pandaPlugin }       from '@studnicky/iridis-panda';

export function generatePandaTheme(roleSchema: RoleSchemaInterfaceType) {
  const engine = new Engine();
  for (const task of coreTasks) engine.tasks.register(task);
  engine.adopt(pandaPlugin);

  engine.pipeline([
    'intake:any',
    'resolve:roles',
    'expand:family',
    'enforce:contrast',
    'derive:variant',
    'emit:pandaTheme',
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

  const out = state.outputs['panda:theme']!;
  // out.colors      : { primary: '#...', text: '#...', background: '#...', ... }
  // out.pandaConfig : "export default defineConfig({\n  theme: {\n    extend: {\n      tokens: {\n        colors: {...}\n      }\n    }\n  }\n});"
  // out.unoConfig   : "export default defineConfig({\n  theme: {\n    colors: {...}\n  }\n});"

  return out;
}
```

`state.outputs['panda:theme']` is typed as `PandaOutputInterfaceType`:

| Field | Shape | Notes |
|---|---|---|
| `colors` | `Record<string, string>` | The shared flat token map both configs below are generated from. |
| `pandaConfig` | `string` | Source of a `panda.config.ts` module. Panda's design-token convention wraps each leaf value as `{ value: hex }`, nested under `theme.extend.tokens.colors`. |
| `unoConfig` | `string` | Source of a UnoCSS config module. UnoCSS consumes flat hex values directly, nested under `theme.colors`. |

## Token mapping

| Token | Role candidates (first match wins) |
|---|---|
| `primary` | `brand` |
| `secondary` | `accent-alt`, `brand` |
| `background` | `background` |
| `surface` | `surface`, `bg-soft`, `background` |
| `text` | `text` |
| `textMuted` | `text-subtle`, `muted`, `text` |
| `border` | `border`, `divider`, `muted` |
| `success` | `success`, `brand` |
| `warning` | `warning`, `brand` |
| `error` | `error` |
| `info` | `info`, `brand` |

A token is omitted from `colors` (and therefore from both config outputs)
when none of its candidate roles resolve in `state.roles`.

Part of [iridis](https://github.com/Studnicky/iridis).
