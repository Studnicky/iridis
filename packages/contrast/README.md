# @studnicky/iridis-contrast

Enforces WCAG 2.1 AA / AAA luminance contrast, APCA Lc (WCAG 3 draft), and
Brettel-Viénot CVD-aware contrast surveillance. Each enforcement task iterates
the foreground role's OKLCH lightness via the `ensureContrast` primitive
(step 0.02, max 50 iterations) until the declared `minRatio` is met; results
land in `state.metadata.wcag.{aa,aaa,apca,cvd}` for inspection.

APCA Lc target selection is intent-driven: `EnforceApca` reads each pair's
foreground / background intent and picks Lc 75 (body text), Lc 60 (fluent /
headline text), or Lc 45 (non-text UI) per the WCAG 3 Bronze draft. The
`pair.minRatio` field on an `algorithm: 'apca'` pair is ignored by the APCA
task — the target is selected from intent. Pairs with no declared intent on
either side fall back to Lc 75 — the body-text floor — so undeclared schemas
still hit the strict tier.

CVD simulation is advisory: `enforce:cvdSimulate` writes per-pair warnings to
`state.metadata.wcag.cvd.warnings` when any of `protanopia`, `deuteranopia`,
`tritanopia`, or `achromatopsia` collapses contrast below the per-type
stability floor. It never modifies `state.roles`.

## Install

```bash
npm install @studnicky/iridis @studnicky/iridis-contrast
```

## Usage

```ts
import { Engine, coreTasks } from '@studnicky/iridis';
import { contrastPlugin }    from '@studnicky/iridis-contrast';

const engine = new Engine();
for (const task of coreTasks) engine.tasks.register(task);
engine.adopt(contrastPlugin);

engine.pipeline([
  'intake:any',
  'expand:family',
  'resolve:roles',
  'enforce:wcagAA',
  'enforce:apca',
  'enforce:cvdSimulate',
  'derive:variant',
  'emit:json',
]);

const state = await engine.run({
  'colors':   ['#8B5CF6'],
  'roles':    yourRoleSchema,
  'contrast': { 'level': 'AA', 'algorithm': 'wcag21' },
});

const wcag = state.metadata['wcag']!;
// wcag.aa?.pairs   : WcagPairResultInterface[]   — { foreground, background, required, before, after, pass }
// wcag.aaa?.pairs  : WcagPairResultInterface[]
// wcag.apca?.pairs : ApcaPairResultInterface[]   — { foreground, background, requiredLc, beforeLc, afterLc, pass }
// wcag.cvd?.warnings: CvdPairWarningInterface[]  — { foreground, background, cvdType, drop, dropThreshold, ... }
```

## Tasks

| Name | Behaviour |
|---|---|
| `enforce:wcagAA` | Walks `contrastPairs` with `algorithm: 'wcag21'`, lifts foregrounds to the AA tier (4.5:1 text, 3:1 non-text). |
| `enforce:wcagAAA` | Same loop, AAA tier (7:1 text, 4.5:1 large text). |
| `enforce:apca` | Walks pairs with `algorithm: 'apca'`, lifts to the intent-driven Lc tier (75 / 60 / 45). |
| `enforce:cvdSimulate` | Re-evaluates WCAG luminance contrast against four CVD simulations and records warnings. Advisory only. |

`state.roles` is mutated in place by every enforcement task: a `roles.text`
that started at 3:1 against `roles.background` is replaced with the
contrast-lifted record. Downstream emit tasks read the lifted version
without any additional configuration.

The plugin also exports `CVD_THRESHOLDS`, `cvdMatrices`, `protanopiaMatrix`,
`deuteranopiaMatrix`, `tritanopiaMatrix`, and `achromatopsiaMatrix` so callers
can run CVD simulations independently of the pipeline.

Part of [iridis](https://github.com/Studnicky/iridis).
