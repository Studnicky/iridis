/**
 * RDF plugin end-to-end tests.
 *
 * Asserts plugin shape and drives the reason:annotate / reason:serialize pair.
 * n3 is the plugin's runtime dep — workspace install resolves it.
 */
import { test } from 'node:test';
import assert   from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

import { Engine }       from '@studnicky/iridis/engine';
import { coreTasks }    from '@studnicky/iridis/tasks';
import type { RoleSchemaInterface } from '@studnicky/iridis';
import { rdfPlugin, RdfPlugin, colorologyVocab } from '@studnicky/iridis-rdf';

const REASON_SERIALIZE_GOLDEN = new URL(
  '../fixtures/reason-serialize-golden.ttl',
  import.meta.url,
);

/**
 * Normalises a Turtle string for golden-fixture comparison. Two sources of
 * non-determinism are filtered before line-sort:
 *
 *   1. The palette IRI embeds `ctx.startedAt` (Date.now). Any triple whose
 *      subject or object contains `colorology/palette/run-` is dropped.
 *
 *   2. The n3 `Writer` assigns blank-node labels (`_:n3-0`, `_:n3-1`, …) in
 *      insertion order — stable within one run but the labels themselves
 *      carry no semantic value. Any line referencing a `_:n3-` label is
 *      dropped from the comparison. The number of such lines is asserted
 *      separately so we still catch a change in blank-node count.
 *
 * Remaining lines are sorted to defeat any future ordering shuffle inside
 * the writer.
 */
function normaliseTurtle(ttl: string): string {
  const lines = ttl.split('\n');
  const stable: string[] = [];
  for (const raw of lines) {
    if (raw.includes('colorology/palette/run-')) continue;
    if (raw.includes('_:n3-'))                   continue;
    stable.push(raw);
  }
  return stable.sort().join('\n');
}

const ROLES: RoleSchemaInterface = {
  'name': 'simple',
  'roles': [
    { 'name': 'primary',    'required': true },
    { 'name': 'background', 'required': true },
  ],
};

function freshEngine(): Engine {
  const engine = new Engine();
  for (const t of coreTasks)    engine.tasks.register(t);
  engine.adopt(rdfPlugin);
  return engine;
}

test('RdfPlugin e2e :: shape :: singleton is an instance of RdfPlugin', () => {
  assert.ok(rdfPlugin instanceof RdfPlugin);
  assert.strictEqual(rdfPlugin.name,    'rdf');
  assert.strictEqual(rdfPlugin.version, '0.1.0');
});

test('RdfPlugin e2e :: shape :: registers reason:annotate + reason:serialize', () => {
  const taskNames = rdfPlugin.tasks().map((t) => t.name).sort();
  assert.deepStrictEqual(taskNames, ['reason:annotate', 'reason:serialize']);
});

test('RdfPlugin e2e :: shape :: colorologyVocab exposes Role IRI constant', () => {
  assert.strictEqual(typeof colorologyVocab.Role, 'string');
  assert.ok(colorologyVocab.Role.startsWith('http'), 'Role IRI is an http(s) URL');
});

test('RdfPlugin e2e :: happy :: reason:annotate writes a graph onto state', async () => {
  const engine = freshEngine();
  engine.pipeline([
    'intake:hex',
    'resolve:roles',
    'reason:annotate',
  ]);

  const state = await engine.run({
    'colors': ['#5b21b6', '#ffffff'],
    'roles':  ROLES,
  });

  assert.ok(state.outputs.reasoning?.graph !== undefined, 'reason:annotate populated outputs.reasoning.graph');
});

// ---------------------------------------------------------------------------
// reason:serialize scenario coverage
//
// ONE pipeline run produces the serialized Turtle output. The single `it`
// body asserts every observable property of the serialized string —
// presence, non-empty, contains expected colorology IRIs + xsd literals.
// ---------------------------------------------------------------------------
import { describe, it }              from 'node:test';
import type { InputInterface, PaletteStateInterface } from '@studnicky/iridis';

interface RdfScenarioInterface {
  readonly 'name':     string;
  readonly 'pipeline': readonly string[];
  readonly 'input':    InputInterface;
  assert(state: PaletteStateInterface): void;
}

const WIDE_GAMUT_ROLES: RoleSchemaInterface = {
  'name':  'wide-gamut',
  'roles': [
    { 'name': 'accent',     'required': true, 'intent': 'accent',
      'lightnessRange': [0.05, 0.95], 'chromaRange': [0.00, 0.50] },
    { 'name': 'background', 'required': true, 'intent': 'background',
      'lightnessRange': [0.05, 0.15], 'chromaRange': [0.00, 0.03] },
  ],
};

describe('RdfPlugin e2e :: serialize scenarios', () => {
  const scenarios: readonly RdfScenarioInterface[] = [
    {
      'name':     'reason:serialize emits a non-empty Turtle string with colorology IRIs',
      'pipeline': ['intake:hex', 'resolve:roles', 'reason:annotate', 'reason:serialize'],
      'input': {
        'colors': ['#5b21b6', '#ffffff'],
        'roles':  ROLES,
      },
      assert(state): void {
        const reasoning = state.outputs.reasoning;
        assert.ok(reasoning !== undefined,                    'outputs.reasoning present');
        assert.ok(reasoning.graph !== undefined,              'graph populated by reason:annotate');
        assert.ok(reasoning.serialized !== undefined,         'serialized populated by reason:serialize');
        const ttl = reasoning.serialized!;
        assert.ok(typeof ttl === 'string',                    'serialized is a string');
        assert.ok(ttl.length > 0,                             'serialized is non-empty');
        // Turtle output must contain the colorology vocabulary IRIs and per-role / per-color IRIs.
        assert.match(ttl, /https:\/\/studnicky\.dev\/colorology\/role\//,  'contains role IRIs');
        assert.match(ttl, /https:\/\/studnicky\.dev\/colorology\/color\//, 'contains color IRIs');
        assert.match(ttl, /https:\/\/studnicky\.dev\/colorology\//,         'uses colorology vocab');
        // sRGB-only input — no displayP3 channel triples present.
        assert.ok(!ttl.includes('displayP3R'),
          'sRGB-only input emits no colorology:displayP3R triples');
        assert.ok(!ttl.includes('displayP3G'),
          'sRGB-only input emits no colorology:displayP3G triples');
        assert.ok(!ttl.includes('displayP3B'),
          'sRGB-only input emits no colorology:displayP3B triples');
      },
    },
    {
      // R7.4 — wide-gamut OKLCH input must populate colorology:displayP3R/G/B
      // literal triples in the serialized Turtle, channel values at 4dp
      // xsd:decimal precision.
      'name':     'reason:serialize emits displayP3R/G/B triples when the record carries a wide-gamut value',
      'pipeline': ['intake:oklch', 'resolve:roles', 'reason:annotate', 'reason:serialize'],
      'input': {
        // OKLCH(0.7, 0.4, 30) — vivid red-orange outside sRGB → displayP3 populated.
        // OKLCH(0.10, 0.01, 280) — near-black, in sRGB → displayP3 undefined.
        'colors': [{ 'l': 0.7, 'c': 0.4, 'h': 30 }, { 'l': 0.10, 'c': 0.01, 'h': 280 }],
        'roles':  WIDE_GAMUT_ROLES,
      },
      assert(state): void {
        const accent     = state.roles['accent'];
        const background = state.roles['background'];
        assert.ok(accent !== undefined,             'accent role resolved');
        assert.ok(background !== undefined,         'background role resolved');
        assert.ok(accent.displayP3 !== undefined,
          'accent carries displayP3 (out-of-sRGB OKLCH input)');
        assert.ok(background.displayP3 === undefined,
          'background does NOT carry displayP3 (in-sRGB input)');

        const ttl = state.outputs.reasoning?.serialized;
        assert.ok(typeof ttl === 'string' && ttl.length > 0, 'serialized Turtle present');

        // accent's color IRI must have all three displayP3 channel triples.
        // n3 Writer prefixes the colorology IRIs, so we match the predicate
        // local-name. The literal is an xsd:decimal at 4dp.
        assert.match(ttl, /displayP3R/,
          'Turtle contains colorology:displayP3R predicate');
        assert.match(ttl, /displayP3G/,
          'Turtle contains colorology:displayP3G predicate');
        assert.match(ttl, /displayP3B/,
          'Turtle contains colorology:displayP3B predicate');

        // Channel values match accent.displayP3 at 4dp. n3 Writer serialises
        // xsd:decimal as a bare numeric literal (matching the existing
        // wcag21Ratio convention `… 2.02.`), not as a quoted "…" form, so
        // assert on the bare number anchored by the predicate's local-name
        // surface form to avoid colliding with other 4dp decimals.
        const r4 = accent.displayP3!.r.toFixed(4);
        const g4 = accent.displayP3!.g.toFixed(4);
        const b4 = accent.displayP3!.b.toFixed(4);
        assert.match(ttl, new RegExp(`displayP3R[^.]*\\s${r4}\\b`),
          `Turtle contains accent displayP3R literal ${r4}`);
        assert.match(ttl, new RegExp(`displayP3G[^.]*\\s${g4}\\b`),
          `Turtle contains accent displayP3G literal ${g4}`);
        assert.match(ttl, new RegExp(`displayP3B[^.]*\\s${b4}\\b`),
          `Turtle contains accent displayP3B literal ${b4}`);

        // Exactly three displayP3 channel-triple occurrences (one per channel,
        // for accent only — background's record carries no displayP3).
        const p3LineCount =
          (ttl.match(/displayP3R/g) ?? []).length +
          (ttl.match(/displayP3G/g) ?? []).length +
          (ttl.match(/displayP3B/g) ?? []).length;
        assert.strictEqual(p3LineCount, 3,
          'exactly one R + one G + one B triple emitted (background has no displayP3)');
      },
    },
  ];

  for (const sc of scenarios) {
    it(sc.name, async () => {
      const engine = freshEngine();
      engine.pipeline(sc.pipeline);
      const state = await engine.run(sc.input);
      sc.assert(state);
    });
  }
});

// ---------------------------------------------------------------------------
// Golden fixture — locks the Turtle output of intake:hex → resolve:roles →
// reason:annotate → reason:serialize for a stable seed + role schema. Lines
// referencing the per-run palette IRI (Date.now based) and blank-node labels
// (auto-assigned by the n3 Writer) are filtered out of the comparison; see
// `normaliseTurtle` above. Regenerate with UPDATE_GOLDENS=1 after an
// intentional change to ReasonAnnotate or ReasonSerialize.
// ---------------------------------------------------------------------------

const GOLDEN_RDF_ROLES: RoleSchemaInterface = {
  'name':  'golden-rdf',
  'roles': [
    { 'name': 'primary',    'required': true, 'lightnessRange': [0.30, 0.60], 'chromaRange': [0.10, 0.25] },
    { 'name': 'background', 'required': true, 'lightnessRange': [0.05, 0.20], 'chromaRange': [0.00, 0.05] },
  ],
};

test('reason:serialize :: golden :: stable seed matches locked Turtle fixture (palette IRI + blank nodes filtered)', async () => {
  const engine = freshEngine();
  engine.pipeline([
    'intake:hex',
    'resolve:roles',
    'reason:annotate',
    'reason:serialize',
  ]);

  const state = await engine.run({
    'colors': ['#5b21b6', '#0f172a'],
    'roles':  GOLDEN_RDF_ROLES,
  });

  const ttl = state.outputs.reasoning?.serialized;
  assert.ok(ttl !== undefined, 'serialized Turtle present');

  // Independent assertion on the blank-node count: ReasonAnnotate writes
  // two blank nodes (oklch + rgb) per role. Two roles → four blank refs
  // in the unfiltered Turtle.
  const blankRefCount = ttl.split('\n').filter((l) => l.includes('_:n3-')).length;
  assert.strictEqual(blankRefCount, 4,
    `expected 4 blank-node lines (oklch+rgb per role × 2 roles), got ${blankRefCount}`);

  const actual = `${normaliseTurtle(ttl)}\n`;

  if (process.env['UPDATE_GOLDENS'] === '1') {
    writeFileSync(REASON_SERIALIZE_GOLDEN, actual);
  }

  const expected = readFileSync(REASON_SERIALIZE_GOLDEN, 'utf8');
  assert.strictEqual(
    actual,
    expected,
    'reason:serialize Turtle output drifted from golden; regenerate with UPDATE_GOLDENS=1 if intentional',
  );
});
