# Iridis test pattern — scenario matrix

Every test file in `packages/*/tests/` follows the **scenario-matrix** pattern. One subject under test, one runner, one flat scenario table.

## Why

- Coverage is **visible** — the table is the coverage map.
- Boilerplate is **declared once** above the table, not repeated per test.
- Failures are **self-locating** — coordinate-tagged messages name the cell, kind, and scenario.
- Adding a new scenario is one row, not one new function.

## The runner

`packages/<pkg>/tests/_runner/ScenarioRunner.ts` is the canonical runner for every package. It accepts:

```ts
interface ScenarioInterface<TInput, TOutput> {
  readonly name:  string;
  readonly kind:  'happy' | 'edge' | 'unhappy';
  readonly input: TInput;
  assert(output: TOutput | undefined, error: unknown): void | Promise<void>;
}
```

and exposes:

```ts
class ScenarioRunner<TInput, TOutput> {
  constructor(suite: string, subject: (input: TInput) => Promise<TOutput> | TOutput);
  run(scenarios: readonly ScenarioInterface<TInput, TOutput>[]): void;
}
```

Each scenario produces one `node:test` test named `${suite} :: ${kind} :: ${name}`. The runner catches throws and surfaces them as `error` to the scenario's `assert` — `unhappy` scenarios assert against `error`, `happy` against `output`.

## Kinds

| Kind | Meaning | Assertion shape |
|---|---|---|
| `happy` | Valid input, expected output | `assert(output)` — typed value present, `error` is undefined |
| `edge` | Valid but unusual input (empty arrays, boundary values, wide-gamut color, unicode, max-size) | `assert(output)` — must still succeed; `error` undefined |
| `unhappy` | Invalid input, expected failure | `assert.ok(error instanceof Error)` plus message/shape assertions |

Every subject MUST have at least one of each kind unless one is structurally impossible (e.g., a pure parser with no invalid input space — note that in a comment).

## Cell discipline (from yamete)

A test file is organised into **cells**. Each cell is one logical concern of the subject. Cells appear as comment-headed sections above their scenario table:

```ts
// ---------------------------------------------------------------------------
// Cell 2 — pipeline ordering enforces manifest.requires
//
// requires entries on a task's manifest declare predecessors. The pipeline
// builder must reject orders that violate these declarations:
//   - dep missing from pipeline      → throws
//   - dep appears after dependent    → throws
//   - dep appears before dependent   → accepted
// Math primitive names in `requires` are documentation only and skipped.
// ---------------------------------------------------------------------------
```

Then the scenario table, then `new ScenarioRunner(...).run([...])`.

Cells exist so readers can locate coverage in seconds — comment-header → table → done.

## Coordinate-tagged failure messages

Every assertion inside a scenario carries enough breadcrumb to be located without re-reading the file:

```ts
assert.strictEqual(
  state.colors.length, 3,
  '[subject=Engine, cell=run-happy, scenario=three-seeds] expected 3 colors after intake',
);
```

When a CI failure reports the assertion message, the reader knows the subject, the cell, the scenario, and what was being checked — no archeology required.

## Minimal-suite rule

One file per subject. Multiple cells per file. Bare `test(...)` calls are **disallowed** except for genuinely table-incompatible cases (e.g., a single golden-fixture comparison). Even those should sit at the bottom of the file under a `// --- Golden fixtures ---` divider so the scenario tables dominate.

## File layout template

```ts
import { test } from 'node:test';
import {
  ScenarioRunner,
  assert,
  type ScenarioInterface,
} from '../_runner/ScenarioRunner.ts';
import { SubjectUnderTest } from '...';

// ---------------------------------------------------------------------------
// Test helpers (factories, mocks, stubs)
// ---------------------------------------------------------------------------
function makeInput(overrides: Partial<InputShape> = {}): InputShape { ... }
function makeMock(...): MockShape { ... }

// ---------------------------------------------------------------------------
// Cell 1 — <concern>
//
// <production model: states / transitions / invariants this cell covers>
// ---------------------------------------------------------------------------
interface Cell1Input  { ... }
interface Cell1Output { ... }

const cell1Scenarios: readonly ScenarioInterface<Cell1Input, Cell1Output>[] = [
  {
    name: 'descriptive lowercase phrase',
    kind: 'happy',
    input: { ... },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=...] must not throw');
      assert.ok(output, '[cell=1, scenario=...] output present');
      assert.strictEqual(output!.foo, 'bar', '[cell=1, scenario=...] foo bound');
      // ...more strong assertions
    },
  },
  {
    name: 'empty-array edge',
    kind: 'edge',
    input: { items: [] },
    assert(output, error) { ... },
  },
  {
    name: 'unknown task name throws',
    kind: 'unhappy',
    input: { ... },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=1, scenario=...] expected throw');
      assert.match((error as Error).message, /not registered/, '[cell=1, scenario=...] message shape');
    },
  },
];

new ScenarioRunner<Cell1Input, Cell1Output>(
  'Subject :: cell-1',
  async (input) => { /* drive the subject */ return result; },
).run(cell1Scenarios);

// ---------------------------------------------------------------------------
// Cell 2 — <next concern>
// ---------------------------------------------------------------------------
// ... another table ...
```

## What "comprehensive coverage" means

For each subject:

1. **Happy**: every documented input shape gets a row.
2. **Edge**: every boundary condition gets a row — empty inputs, single-element inputs, maximum-size inputs, wide-gamut color spaces, unicode strings, surrogate-pair strings, deeply-nested structures, missing optional fields, repeated keys.
3. **Unhappy**: every documented error path gets a row — invalid shapes, schema rejections, mid-pipeline failures, dependency violations, hook-time errors. Assert on error class AND message shape AND any side effects (state unchanged, no partial writes).
4. **Invariants**: state shape, id stability, idempotency, ordering. Assert these inside scenarios that exercise them, not as separate one-off tests.

If you can think of a scenario, it goes in the table.

## What goes outside the table

- **Golden fixtures**: byte-equal locked output, kept as a single `test('… :: golden :: …')` at file bottom.
- **Snapshot regressions**: same. One per fixture file.
- **Performance benchmarks**: a separate `.bench.ts` file, not under the scenario runner.

Everything else: table.
