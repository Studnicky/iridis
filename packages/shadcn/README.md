# @studnicky/iridis-shadcn

Emits a shadcn/ui-compatible CSS custom-property theme from resolved roles,
in the Tailwind v4 convention: bare space-separated OKLCH `L C H` triples (no
`oklch(...)` wrapper, no unit on hue) since shadcn's own utilities wrap the
variable at the usage site via `oklch(var(--x))`.

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
npm install @studnicky/iridis @studnicky/iridis-shadcn
```

## Usage

```ts
import type { RoleSchemaInterfaceType } from '@studnicky/iridis';

import { Engine, coreTasks } from '@studnicky/iridis';
import { shadcnPlugin }      from '@studnicky/iridis-shadcn';

export function generateShadcnTheme(roleSchema: RoleSchemaInterfaceType) {
  const engine = new Engine();
  for (const task of coreTasks) engine.tasks.register(task);
  engine.adopt(shadcnPlugin);

  engine.pipeline([
    'intake:any',
    'resolve:roles',
    'expand:family',
    'enforce:contrast',
    'emit:shadcnTheme',
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

  const out = state.outputs['shadcn:theme']!;
  // out.colors  : { '--primary': '#...', '--background': '#...', ... } (flat hex, keyed by CSS var name)
  // out.cssVars : ':root {\n  --primary: 0.6200 0.1800 290.00;\n  ...\n}'

  return out;
}
```

`state.outputs['shadcn:theme']` is typed as `ShadcnOutputInterfaceType`:

| Field | Shape | Notes |
|---|---|---|
| `colors` | `Record<string, string>` | CSS variable name to hex, for consumers that want the flat hex map instead of the CSS block. |
| `cssVars` | `string` | A `:root { ... }` block with each variable set to the bare `L C H` OKLCH triple. |

## Variable mapping

| shadcn variable | Role candidates (first match wins) |
|---|---|
| `--background` | `background` |
| `--foreground` | `text` |
| `--card` | `surface`, `background` |
| `--card-foreground` | `text` |
| `--popover` | `surface`, `background` |
| `--popover-foreground` | `text` |
| `--primary` | `brand` |
| `--primary-foreground` | `on-brand`, `text` |
| `--secondary` | `accent-alt`, `brand` |
| `--secondary-foreground` | `text` |
| `--muted` | `bg-soft`, `background` |
| `--muted-foreground` | `text-subtle`, `muted`, `text` |
| `--accent` | `accent-alt`, `brand` |
| `--accent-foreground` | `text` |
| `--destructive` | `error` |
| `--destructive-foreground` | `text` |
| `--border` | `border`, `divider`, `muted` |
| `--input` | `border`, `divider`, `muted` |
| `--ring` | `focus-ring`, `brand` |

A variable is skipped entirely (absent from both `colors` and the `:root`
block) when its whole candidate chain is absent from the resolved palette,
rather than throwing.

Part of [iridis](https://github.com/Studnicky/iridis).
