# @studnicky/iridis-contrast

Enforces WCAG 2.1 AA / AAA luminance contrast, APCA Lc (WCAG 3 draft), color
vision deficiency (CVD) simulation with fixed Machado–Oliveira–Fernandes
severity-1 matrices, and bounded correction. The
AA, AAA, and APCA tasks may adjust foreground lightness through the core
`ensureContrast` primitive. CVD correction instead performs a bounded,
coarse-to-fine OKLCH lightness/chroma search, then coordinates shared and
cyclic foreground/background dependencies before applying corrected roles.
Results land in `state.metadata` under flat keys `contrast:aa`, `contrast:aaa`,
`contrast:apca`, and `contrast:cvd` for inspection.

APCA Lc target selection is intent-driven: `EnforceApca` reads each pair's
foreground / background intent and picks Lc 75 (body text), Lc 60 (fluent /
headline text), or Lc 45 (non-text UI) per the WCAG 3 Bronze draft. The
`pair.minRatio` field on an `algorithm: 'apca'` pair is ignored by the APCA
task. The target is selected from intent. Pairs with no declared intent on
either side use Lc 45, the generic non-text tier; iridis never infers intent
from a role name.

CVD simulation is advisory by default: `enforce:cvdSimulate` writes per-pair
warnings to terminal `state.metadata['contrast:cvd']?.warnings` when any of
`protanopia`, `deuteranopia`, `tritanopia`, or `achromatopsia` collapses
contrast below the per-type stability floor. Set
`input.contrast.cvdCorrect: true` to opt into color correction. Correction may
replace corrected foreground records in `state.roles`; terminal metadata then
includes `corrections` describing the CVD types fixed and remaining, plus
`warnings` for final failures.

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
    'enforce:wcagAA',
    'enforce:apca',
    'enforce:cvdSimulate',
    'derive:variant',
    'emit:json',
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

  const aa   = getContrastMetadata(state.metadata, 'contrast:aa');
  const aaa  = getContrastMetadata(state.metadata, 'contrast:aaa');
  const apca = getContrastMetadata(state.metadata, 'contrast:apca');
  const cvd  = getContrastMetadata(state.metadata, 'contrast:cvd');
  // aa?.pairs        // { foreground, background, required, before, after, pass }
  // aaa?.pairs
  // apca?.pairs      // { foreground, background, requiredLc, beforeLc, afterLc, pass }
  // cvd?.corrections // { foreground, background, cvdTypesFixed, cvdTypesRemaining }
  // cvd?.warnings    // { foreground, background, cvdType, drop, dropThreshold, ... }

  return { aa, aaa, apca, cvd, state };
}
```

## Tasks

| Name | Behaviour |
|---|---|
| `enforce:wcagAA` | Walks `contrastPairs` with `algorithm: 'wcag21'`, lifts foregrounds to the AA tier (4.5:1 text, 3:1 non-text). |
| `enforce:wcagAAA` | Same loop, AAA tier (7:1 text, 4.5:1 large text). |
| `enforce:apca` | Walks pairs with `algorithm: 'apca'`, lifts to the intent-driven Lc tier (75 / 60 / 45). |
| `enforce:cvdSimulate` | Re-evaluates WCAG luminance contrast against four CVD simulations. Advisory by default; `input.contrast.cvdCorrect: true` opts into foreground color correction. |

WCAG and APCA enforcement mutate corrected foreground roles in place: a
`roles.text` that started at 3:1 against `roles.background` is replaced with
the contrast-lifted record. CVD simulation preserves `state.roles` by default
and may replace corrected foreground roles only when
`input.contrast.cvdCorrect` is `true`. Downstream emit tasks read the final
records without additional configuration.

The plugin also exports `CVD_THRESHOLDS` and `cvdMatrices` so callers can run
CVD simulations independently of the pipeline without legacy matrix aliases.

Part of [iridis](https://github.com/Studnicky/iridis).
