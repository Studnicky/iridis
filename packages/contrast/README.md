# @studnicky/iridis-contrast

Resolves WCAG 2.1 AA / AAA luminance contrast and APCA Lc (WCAG 3 draft)
compliance, validates and refines the result under color vision deficiency
(CVD) simulation with fixed Machado–Oliveira–Fernandes severity-1 matrices,
and reports the final state. The plugin registers three tasks:
`enforce:compliance`, `report:compliance`, and `withhold:compliance`.

The selected standard and CVD behavior are input, not stages:
`input.contrast` is `{ algorithm: 'wcag21' | 'apca', level: 'AA' | 'AAA' | 'Lc', enableStrictCompliance?: boolean, nonMandatoryLevel?: 'AA' | 'AAA', cvdMode?: 'warn' | 'nudge' | 'enforce' }`. `cvdMode` defaults to `warn`; `nonMandatoryLevel` defaults to `AA`; `enableStrictCompliance` defaults to `false`.

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

- WCAG AA uses each declared pair minimum. WCAG AAA maps a declared 4.5:1 text
  minimum to 7:1, retains a declared 7:1 minimum, and keeps a declared
  non-text/UI minimum below 4.5:1 at its AA value unless
  `nonMandatoryLevel: 'AAA'` is selected; that selection maps 3:1 to 4.5:1.
  Missing pair minima use 4.5:1 at AA and 7:1 at AAA.
- APCA uses Lc 75 for body text pairs (text intent on background intent).
  A pair declared below 4.5:1 uses the non-mandatory standard: Lc 45 at
  `nonMandatoryLevel: 'AA'` and Lc 60 at `'AAA'`. Every other pair uses Lc 60
  at AA or Lc 75 at AAA.

CVD evaluates all four CVD types (`protanopia`, `deuteranopia`,
`tritanopia`, `achromatopsia`) with a bounded OKLCH lightness/chroma search
for corrective modes. `warn` observes `belowFloor` and `exceedsDrop`
evidence without changing roles or blocking admission. `nudge` corrects
unstated roles for either signal, while unresolved evidence remains advisory.
`enforce` uses the same correction and emits canonical blockers for unresolved
evidence.

`report:compliance` runs last, after `derive:variant`. It measures the final
roles and writes `state.metadata['contrast:complianceReport']`:
`{ compliant, disposition, selected: { algorithm, level }, pairs, problemPairs }`.
`disposition` is `resolved` when every pair passes, `best-effort` when a
non-strict run has unresolved pairs, and `withheld` when strict compliance
withholds unresolved roles. Each pair carries `foreground`, `background`,
`required`, `actual`, `shortfall`, `passed`, `adjustedRoles`, and `constraints`.
Constraints are `pin`, `range`, `hue-relationship`, `gamut`, `cvd-floor`, or
`cvd-drop`. `problemPairs` is the stable-sorted subset of the same pair records
whose `passed` value is false.

`ContrastFeasibility.analyzeSchema(schema, options)` evaluates declared pair envelopes for schema authors.
It reports reachable, unreachable, hue-dependent, or indeterminate reachability without changing a palette.
`ContrastFeasibility.proveRun(state)` evaluates the terminal resolved roles with the engine contrast primitives.
A failing pair may carry an optional `proof` containing its required value, best actual value, shortfall, and limiting bounds.
Fixed relationship hues produce direct proof evidence; unanchored-hue analysis keeps sampled evidence explicitly separate.
The advisory APIs preserve the same range, gamut, pin, selected-standard, and CVD-floor constraints as compliance.

The CVD record lands in `state.metadata['contrast:cvd']`.
`warnings` retain `belowFloor` and `exceedsDrop` evidence for every mode;
`corrections[].adjustedRoles` lists roles changed by `nudge` or `enforce`;
and `blocked` is populated only by unresolved `enforce` constraints. Each
per-pair CVD evaluation carries `belowFloor`, `exceedsDrop`, and `fail`;
`fail` is true only for unresolved `enforce` evidence.

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
import type { RoleSchemaEntity } from "@studnicky/iridis";

import { Engine, coreTasks } from "@studnicky/iridis";
import { contrastPlugin, CvdResultSetEntity } from "@studnicky/iridis-contrast";

export function generateAccessiblePalette(roleSchema: RoleSchemaEntity.Type) {
  const engine = new Engine();
  for (const task of coreTasks) engine.tasks.register(task);
  engine.adopt(contrastPlugin);

  engine.pipeline([
    "intake:any",
    "resolve:roles",
    "expand:family",
    "enforce:compliance",
    "derive:variant",
    "report:compliance",
  ]);

  const state = engine.run({
    bypass: undefined,
    colors: ["#8B5CF6"],
    contrast: {
      algorithm: "wcag21",
      cvdMode: "enforce",
      extra: undefined,
      level: "AA",
      nonMandatoryLevel: "AA",
    },
    emit: undefined,
    maxColors: undefined,
    metadata: undefined,
    roles: roleSchema,
    runtime: undefined,
  });

  const report = state.metadata["contrast:complianceReport"];
  // report?.compliant     // true when every pair passes the selected standard
  // report?.disposition   // resolved | best-effort | withheld
  // report?.pairs         // { foreground, background, required, actual, shortfall, passed, adjustedRoles, constraints }
  // report?.problemPairs  // stable-sorted failed subset of report.pairs

  const cvd = CvdResultSetEntity.intake(state.metadata["contrast:cvd"]);
  // cvd.corrections // { foreground, background, adjustedRoles, cvdTypesFixed, cvdTypesRemaining }
  // cvd.blocked     // pairs whose both endpoints are stated

  return { report, cvd, state };
}
```

## Tasks

| Name                  | Behaviour                                                                                                                                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enforce:compliance`  | Applies the selected standard (`input.contrast`) to every declared pair, runs CVD correction as a validator and refiner of the same policy, re-measures after correction, and moves only derived endpoints. |
| `report:compliance`   | Measures the final roles and writes `metadata['contrast:complianceReport']`.                                                                                                                                |
| `withhold:compliance` | Marks the terminal report `withheld` when `enableStrictCompliance` is true and problem pairs remain, while preserving the best-achievable roles and variants.                                               |

Corrected derived roles are replaced in `state.roles`; stated roles are never
mutated. Downstream emit tasks read the final records without additional
configuration.

The plugin also exports `CVD_THRESHOLDS` and `cvdMatrices` so callers can run
CVD simulations independently of the pipeline.

Part of [iridis](https://github.com/Studnicky/iridis).
