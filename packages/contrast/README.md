# @studnicky/iridis-contrast

Resolves WCAG 2.1 AA / AAA luminance contrast and APCA Lc (WCAG 3 draft)
compliance, validates and refines the result under color vision deficiency
(CVD) simulation with fixed Machado–Oliveira–Fernandes severity-1 matrices,
and reports the final state. The plugin registers two tasks:
`enforce:compliance` and `report:compliance`.

The selected standard is input, not a stage:
`input.contrast` is `{ algorithm: 'wcag21' | 'apca', level: 'AA' | 'AAA' | 'Lc', cvdCorrect: true }`.

`enforce:compliance` is one bounded, deterministic resolver. It applies the
selected standard to every declared contrast pair, schema pairs and extra
pairs alike; a schema pair's own `algorithm` label does not exempt it. CVD
correction runs as a validator and refiner of that same policy, and the
selected standard is re-measured after CVD correction. Stated (pinned) roles
keep their exact color in every step. For each failing pair the resolver moves
a derived endpoint: the derived foreground first, otherwise the derived
background. When both endpoints are stated the pair is reported as blocked and
nothing is mutated. A pair's effective minimum is the stricter of the selected
target and the pair's declared minimum; a declared maximum stays a hard limit.

Targets:

- WCAG AA: 4.5:1. WCAG AAA: 7:1.
- APCA: Lc 75 for body text pairs, Lc 60 for other meaningful text roles,
  Lc 45 for large or heavy display text, Lc 30 for solid non-text.

CVD correction performs a bounded, coarse-to-fine OKLCH lightness/chroma
search over the four CVD types (`protanopia`, `deuteranopia`, `tritanopia`,
`achromatopsia`), then coordinates shared and cyclic foreground/background
dependencies before applying corrected roles. `input.contrast.cvdCorrect` is
`true`.

`report:compliance` runs last, after `derive:variant`. It measures the final
roles and writes `state.metadata['contrast:complianceReport']`:
`{ compliant, cvdCompliant, selected: { algorithm, level }, blockedPairs, pairs }`.
Each pair carries `foreground`, `background`, `requiredTrichromat`,
`actualTrichromat`, `cvd` (one evaluation per CVD type), `passed`, the optional
`adjustedRole` (the role the resolver moved), and a `disposition`:
`not-needed`, `adjusted-foreground`, `adjusted-background`, `blocked-stated`,
or `unresolved`. Each blocked pair carries `foreground`, `background`,
`requiredTrichromat`, `actualTrichromat`, `target`, and a `reason`:
`stated-both`, `solver-exhausted`, or `relation-tolerance`. Consumers admit a
palette only when `compliant` is `true`.

The CVD record lands in `state.metadata['contrast:cvd']`; `corrections[].adjustedRoles`
lists the roles CVD correction moved, and `blocked` lists pairs whose both
endpoints are stated.

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
npm install @studnicky/iridis @studnicky/iridis-contrast
```

## Usage

```ts
import type { RoleSchemaInterfaceType } from '@studnicky/iridis';

import { Engine, coreTasks } from '@studnicky/iridis';
import {
  contrastPlugin,
  getContrastMetadata,
} from '@studnicky/iridis-contrast';

export function generateAccessiblePalette(roleSchema: RoleSchemaInterfaceType) {
  const engine = new Engine();
  for (const task of coreTasks) engine.tasks.register(task);
  engine.adopt(contrastPlugin);

  engine.pipeline([
    'intake:any',
    'resolve:roles',
    'expand:family',
    'enforce:compliance',
    'derive:variant',
    'report:compliance',
  ]);

  const state = engine.run({
    'bypass':   undefined,
    'colors':   ['#8B5CF6'],
    'contrast': {
      'algorithm':  'wcag21',
      'cvdCorrect': true,
      'extra':      undefined,
      'level':      'AA',
    },
    'emit':      undefined,
    'maxColors': undefined,
    'metadata':  undefined,
    'roles':     roleSchema,
    'runtime':   undefined,
  });

  const report = state.metadata['contrast:complianceReport'];
  // report?.compliant     // true when every pair passes the selected standard
  // report?.pairs         // { foreground, background, requiredTrichromat, actualTrichromat, cvd, passed, adjustedRole?, disposition }
  // report?.blockedPairs  // { foreground, background, requiredTrichromat, actualTrichromat, target, reason }
  // report?.cvdCompliant  // true when CVD validation passes

  const cvd = getContrastMetadata(state.metadata, 'contrast:cvd');
  // cvd?.corrections // { foreground, background, adjustedRoles, cvdTypesFixed, cvdTypesRemaining }
  // cvd?.blocked     // pairs whose both endpoints are stated

  return { report, cvd, state };
}
```

## Tasks

| Name | Behaviour |
|---|---|
| `enforce:compliance` | Applies the selected standard (`input.contrast`) to every declared pair, runs CVD correction as a validator and refiner of the same policy, re-measures after correction, and moves only derived endpoints. |
| `report:compliance` | Measures the final roles and writes `metadata['contrast:complianceReport']`. |

Corrected derived roles are replaced in `state.roles`; stated roles are never
mutated. Downstream emit tasks read the final records without additional
configuration.

The plugin also exports `CVD_THRESHOLDS` and `cvdMatrices` so callers can run
CVD simulations independently of the pipeline.

Part of [iridis](https://github.com/Studnicky/iridis).
