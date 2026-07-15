/**
 * RdfPlugin — scenario-matrix e2e suite.
 *
 * Subject: `RdfPlugin` / `reason:annotate` / `reason:serialize`.
 * Drives plugin shape, task registration, annotation, serialization format
 * negotiation, RDF vocabulary correctness, wide-gamut P3 channels, and
 * golden-fixture regression.
 *
 * Cells:
 *   1. plugin-shape      — singleton identity, name, version, task list
 *   2. vocab             — iridisVocab IRI constants
 *   3. reason:annotate   — graph construction (happy / edge / unhappy)
 *   4. reason:serialize  — format negotiation + output shape
 *   5. rdf-content       — Turtle IRI correctness, blank nodes, P3 channels
 *   6. serialize-missing-graph — skips gracefully when graph absent
 */

import { test, describe, it } from 'node:test';
import { readFileSync, writeFileSync } from 'node:fs';

import { Engine }     from '@studnicky/iridis/engine';
import { coreTasks }  from '@studnicky/iridis/tasks';
import type {
  InputInterface,
  PaletteStateInterface,
  RoleSchemaInterfaceType,
} from '@studnicky/iridis';

import {
  ScenarioRunner,
  assert,
  type ScenarioInterface,
} from '../_runner/ScenarioRunner.ts';

import {
  rdfPlugin,
  RdfPlugin,
  iridisVocab,
  reasonAnnotate,
  reasonSerialize,
} from '@studnicky/iridis-rdf';

// ---------------------------------------------------------------------------
// Golden fixture path
// ---------------------------------------------------------------------------

const REASON_SERIALIZE_GOLDEN = new URL(
  '../fixtures/reason-serialize-golden.ttl',
  import.meta.url,
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function freshEngine(): Engine {
  const engine = new Engine();
  for (const t of coreTasks) engine.tasks.register(t);
  engine.adopt(rdfPlugin);
  return engine;
}

/**
 * Normalises a Turtle string for golden-fixture comparison.
 *
 * Removes two sources of non-determinism before sorting:
 *   1. palette IRI — embeds `ctx.startedAt` (Date.now)
 *   2. n3 blank-node labels (`_:n3-0`, `_:n3-1`, …) — insertion-order only
 *
 * Returns a sorted, filtered string. Blank-node line count is asserted
 * separately so a change in cardinality still fails the golden test.
 */
function normaliseTurtle(ttl: string): string {
  const lines  = ttl.split('\n');
  const stable: string[] = [];
  for (const raw of lines) {
    if (raw.includes('iridis/palette/run-')) continue;
    if (raw.includes('_:n3-'))                   continue;
    stable.push(raw);
  }
  return stable.sort().join('\n');
}

const SIMPLE_ROLES: RoleSchemaInterfaceType = {
  'contrastPairs': undefined,
  'description':   undefined,
  'name': 'simple',
  'roles': [
    { 'name': 'primary',    'required': true, 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined },
    { 'name': 'background', 'required': true, 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined },
  ],
};

const WIDE_GAMUT_ROLES: RoleSchemaInterfaceType = {
  'contrastPairs': undefined,
  'description':   undefined,
  'name':  'wide-gamut',
  'roles': [
    {
      'name': 'accent', 'required': true, 'intent': 'accent',
      'lightnessRange': [0.05, 0.95], 'chromaRange': [0.00, 0.50],
      'derivedFrom': undefined,
      'description': undefined,
      'hue': undefined,
      'hueClamp': undefined,
      'hueOffset': undefined
    },
    {
      'name': 'background', 'required': true, 'intent': 'background',
      'lightnessRange': [0.05, 0.15], 'chromaRange': [0.00, 0.03],
      'derivedFrom': undefined,
      'description': undefined,
      'hue': undefined,
      'hueClamp': undefined,
      'hueOffset': undefined
    },
  ],
};

const GOLDEN_ROLES: RoleSchemaInterfaceType = {
  'contrastPairs': undefined,
  'description':   undefined,
  'name':  'golden-rdf',
  'roles': [
    { 'name': 'primary',    'required': true, 'lightnessRange': [0.30, 0.60], 'chromaRange': [0.10, 0.25], 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined },
    { 'name': 'background', 'required': true, 'lightnessRange': [0.05, 0.20], 'chromaRange': [0.00, 0.05], 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined },
  ],
};

// ---------------------------------------------------------------------------
// Cell 1 — plugin shape
//
// RdfPlugin is exported as a singleton `rdfPlugin` and as a constructable
// class `RdfPlugin`. Shape assertions: name, version, task list contents.
// `unhappy` kind is structurally impossible — shape properties are readonly
// literals and task() never throws.
// ---------------------------------------------------------------------------

interface PluginShapeInput  { readonly dummy: true }
interface PluginShapeOutput {
  readonly isInstance:  boolean;
  readonly name:        string;
  readonly version:     string;
  readonly taskNames:   readonly string[];
  readonly annotateIs:  boolean;
  readonly serializeIs: boolean;
}

const pluginShapeScenarios: readonly ScenarioInterface<PluginShapeInput, PluginShapeOutput>[] = [
  {
    name: 'singleton is an instance of RdfPlugin with expected name and version',
    kind: 'happy',
    input: { dummy: true },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=singleton] no throw');
      assert.strictEqual(output!.isInstance, true,    '[cell=1, scenario=singleton] instanceof RdfPlugin');
      assert.strictEqual(output!.name,       'rdf',   '[cell=1, scenario=singleton] name');
      assert.strictEqual(output!.version,    '0.1.0', '[cell=1, scenario=singleton] version');
    },
  },
  {
    name: 'tasks() returns exactly reason:annotate and reason:serialize',
    kind: 'happy',
    input: { dummy: true },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=task-list] no throw');
      assert.deepStrictEqual(
        [...output!.taskNames].sort(),
        ['reason:annotate', 'reason:serialize'],
        '[cell=1, scenario=task-list] exact task names',
      );
    },
  },
  {
    name: 'exported singletons are the same instances tasks() returns',
    kind: 'happy',
    input: { dummy: true },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=identity] no throw');
      assert.strictEqual(output!.annotateIs,  true, '[cell=1, scenario=identity] reasonAnnotate is same ref');
      assert.strictEqual(output!.serializeIs, true, '[cell=1, scenario=identity] reasonSerialize is same ref');
    },
  },
  {
    name: 'tasks() returns a new array each call (no shared mutable ref)',
    kind: 'edge',
    input: { dummy: true },
    assert(_output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=array-fresh] no throw');
      const a = rdfPlugin.tasks();
      const b = rdfPlugin.tasks();
      // Not the same array reference — no shared mutable state.
      assert.notStrictEqual(a, b, '[cell=1, scenario=array-fresh] each call returns a new array');
      assert.strictEqual(a.length, 2, '[cell=1, scenario=array-fresh] still two tasks');
    },
  },
];

new ScenarioRunner<PluginShapeInput, PluginShapeOutput>(
  'RdfPlugin :: cell-1 :: plugin-shape',
  (_input) => {
    const tasks = rdfPlugin.tasks();
    return {
      isInstance:  rdfPlugin instanceof RdfPlugin,
      name:        rdfPlugin.name,
      version:     rdfPlugin.version,
      taskNames:   tasks.map((t) => t.name),
      annotateIs:  tasks.some((t) => t === reasonAnnotate),
      serializeIs: tasks.some((t) => t === reasonSerialize),
    };
  },
).run(pluginShapeScenarios);

// ---------------------------------------------------------------------------
// Cell 2 — vocab IRI constants
//
// iridisVocab exposes every predicate used by ReasonAnnotate. All IRIs
// must be http(s) URIs anchored to the studnicky.dev/iridis namespace.
// Edge: IRI concatenation is stable (base + fragment yields a full URI).
// unhappy kind is structurally impossible — readonly literal properties.
// ---------------------------------------------------------------------------

interface VocabInput  { readonly dummy: true }
interface VocabOutput {
  readonly role:        string;
  readonly hasColor:    string;
  readonly hasRole:     string;
  readonly oklchL:      string;
  readonly oklchC:      string;
  readonly oklchH:      string;
  readonly rgbR:        string;
  readonly rgbG:        string;
  readonly rgbB:        string;
  readonly hex:         string;
  readonly wcag21Ratio: string;
  readonly displayP3R:  string;
  readonly displayP3G:  string;
  readonly displayP3B:  string;
}

const vocabScenarios: readonly ScenarioInterface<VocabInput, VocabOutput>[] = [
  {
    name: 'all IRI constants are http(s) URLs under studnicky.dev/iridis',
    kind: 'happy',
    input: { dummy: true },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=all-iris] no throw');
      const iris = Object.values(output!) as string[];
      for (const iri of iris) {
        assert.ok(typeof iri === 'string', `[cell=2, scenario=all-iris] ${iri} is a string`);
        assert.ok(iri.startsWith('https://studnicky.dev/iridis'), `[cell=2, scenario=all-iris] ${iri} under iridis namespace`);
      }
    },
  },
  {
    name: 'displayP3R/G/B predicates are distinct IRIs',
    kind: 'happy',
    input: { dummy: true },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=p3-distinct] no throw');
      const iris = new Set([output!.displayP3R, output!.displayP3G, output!.displayP3B]);
      assert.strictEqual(iris.size, 3, '[cell=2, scenario=p3-distinct] three distinct IRI values');
    },
  },
  {
    name: 'Role IRI differs from predicate IRIs (type vs property)',
    kind: 'edge',
    input: { dummy: true },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=role-distinct] no throw');
      const predicates = [
        output!.hasColor, output!.hasRole,
        output!.oklchL, output!.oklchC, output!.oklchH,
        output!.rgbR, output!.rgbG, output!.rgbB,
        output!.hex, output!.wcag21Ratio,
        output!.displayP3R, output!.displayP3G, output!.displayP3B,
      ];
      for (const p of predicates) {
        assert.notStrictEqual(output!.role, p, `[cell=2, scenario=role-distinct] Role IRI != ${p}`);
      }
    },
  },
];

new ScenarioRunner<VocabInput, VocabOutput>(
  'RdfPlugin :: cell-2 :: vocab',
  (_input) => ({
    role:        iridisVocab.Role,
    hasColor:    iridisVocab.hasColor,
    hasRole:     iridisVocab.hasRole,
    oklchL:      iridisVocab.oklchL,
    oklchC:      iridisVocab.oklchC,
    oklchH:      iridisVocab.oklchH,
    rgbR:        iridisVocab.rgbR,
    rgbG:        iridisVocab.rgbG,
    rgbB:        iridisVocab.rgbB,
    hex:         iridisVocab.hex,
    wcag21Ratio: iridisVocab.wcag21Ratio,
    displayP3R:  iridisVocab.displayP3R,
    displayP3G:  iridisVocab.displayP3G,
    displayP3B:  iridisVocab.displayP3B,
  }),
).run(vocabScenarios);

// ---------------------------------------------------------------------------
// Cell 3 — reason:annotate graph construction
//
// reason:annotate reads state.roles + state.colors and writes an n3 Store
// onto outputs.reasoning.graph. The store must be non-null and iterable
// (quads can be counted), and WCAG contrast pairs must be emitted for all
// role cross-products.
// ---------------------------------------------------------------------------

interface AnnotateInput {
  readonly colors:  readonly (string | { l: number; c: number; h: number })[];
  readonly roles:   RoleSchemaInterfaceType;
  readonly pipeline: readonly string[];
}
interface AnnotateOutput {
  readonly graphPresent:   boolean;
  readonly quadCount:      number;
  readonly serialized:     string | undefined;
}

const annotateScenarios: readonly ScenarioInterface<AnnotateInput, AnnotateOutput>[] = [
  {
    name: 'two hex colors produce a non-empty n3 graph',
    kind: 'happy',
    input: {
      colors:   ['#5b21b6', '#ffffff'],
      roles:    SIMPLE_ROLES,
      pipeline: ['intake:hex', 'resolve:roles', 'reason:annotate'],
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=two-hex] no throw');
      assert.strictEqual(output!.graphPresent, true,  '[cell=3, scenario=two-hex] graph written');
      assert.ok(output!.quadCount > 0,                '[cell=3, scenario=two-hex] store has quads');
    },
  },
  {
    name: 'two-role graph emits two wcag21Ratio contrast-pair triples',
    kind: 'happy',
    input: {
      colors:   ['#5b21b6', '#ffffff'],
      roles:    SIMPLE_ROLES,
      pipeline: ['intake:hex', 'resolve:roles', 'reason:annotate', 'reason:serialize'],
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=wcag-pairs] no throw');
      const ttl = output!.serialized ?? '';
      const pairCount = (ttl.match(/wcag21Ratio/g) ?? []).length;
      // Two roles → 2×1 = 2 directed pairs (primary-on-background, background-on-primary)
      assert.strictEqual(pairCount, 2, '[cell=3, scenario=wcag-pairs] exactly 2 contrast ratio triples');
    },
  },
  {
    name: 'three-role graph emits six wcag21Ratio contrast-pair triples',
    kind: 'happy',
    input: {
      colors: ['#5b21b6', '#ffffff', '#000000'],
      roles: {
        'contrastPairs': undefined,
        'description':   undefined,
        'name': 'three-role',
        'roles': [
          { 'name': 'primary',    'required': true, 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined },
          { 'name': 'secondary',  'required': true, 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined },
          { 'name': 'background', 'required': true, 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined },
        ],
      },
      pipeline: ['intake:hex', 'resolve:roles', 'reason:annotate', 'reason:serialize'],
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=three-roles] no throw');
      const ttl = output!.serialized ?? '';
      const pairCount = (ttl.match(/wcag21Ratio/g) ?? []).length;
      // 3 roles → 3×2 = 6 directed pairs
      assert.strictEqual(pairCount, 6, '[cell=3, scenario=three-roles] 6 contrast-pair triples');
    },
  },
  {
    name: 'single-role graph emits zero contrast-pair triples (no cross-products)',
    kind: 'edge',
    input: {
      colors: ['#5b21b6'],
      roles:  { 'contrastPairs': undefined, 'description': undefined, 'name': 'single', 'roles': [{ 'name': 'primary', 'required': true, 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined }] },
      pipeline: ['intake:hex', 'resolve:roles', 'reason:annotate', 'reason:serialize'],
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=single-role] no throw');
      assert.strictEqual(output!.graphPresent, true, '[cell=3, scenario=single-role] graph present');
      const ttl = output!.serialized ?? '';
      const pairCount = (ttl.match(/wcag21Ratio/g) ?? []).length;
      assert.strictEqual(pairCount, 0, '[cell=3, scenario=single-role] no cross-product pairs for single role');
    },
  },
  {
    name: 'reason:annotate is idempotent: calling twice overwrites the graph, quad count remains stable',
    kind: 'edge',
    input: {
      colors:   ['#5b21b6', '#ffffff'],
      roles:    SIMPLE_ROLES,
      pipeline: ['intake:hex', 'resolve:roles', 'reason:annotate', 'reason:annotate', 'reason:serialize'],
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=idempotent] no throw');
      assert.strictEqual(output!.graphPresent, true, '[cell=3, scenario=idempotent] graph present');
      // The second annotate replaces the store; role+pair structure must still be consistent
      const ttl = output!.serialized ?? '';
      const pairCount = (ttl.match(/wcag21Ratio/g) ?? []).length;
      assert.strictEqual(pairCount, 2, '[cell=3, scenario=idempotent] two pairs in idempotent run');
    },
  },
  {
    name: 'OKLCH wide-gamut input annotates without throwing',
    kind: 'edge',
    input: {
      colors:   [{ l: 0.7, c: 0.4, h: 30 }, { l: 0.10, c: 0.01, h: 280 }],
      roles:    WIDE_GAMUT_ROLES,
      pipeline: ['intake:oklch', 'resolve:roles', 'reason:annotate'],
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=oklch-annotate] no throw');
      assert.strictEqual(output!.graphPresent, true, '[cell=3, scenario=oklch-annotate] graph populated');
      assert.ok(output!.quadCount > 0, '[cell=3, scenario=oklch-annotate] quads present');
    },
  },
];

new ScenarioRunner<AnnotateInput, AnnotateOutput>(
  'RdfPlugin :: cell-3 :: reason:annotate',
  async (input) => {
    const engine = freshEngine();
    engine.pipeline(input.pipeline);
    const state = await engine.run({
      'bypass':    undefined,
      'colors':    input.colors as InputInterface['colors'],
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  undefined,
      'roles':     input.roles,
      'runtime':   undefined,
    });
    const graph = state.outputs['rdf:reasoningGraph'] as Iterable<unknown> | undefined;
    let quadCount = 0;
    if (graph) {
      for (const _ of graph) quadCount += 1;
    }
    return {
      graphPresent: graph !== undefined,
      quadCount,
      serialized:   state.outputs['rdf:serialized'] as string | undefined,
    };
  },
).run(annotateScenarios);

// ---------------------------------------------------------------------------
// Cell 4 — reason:serialize format negotiation
//
// ReasonSerialize reads metadata.reasoning.format (defaulting to 'Turtle').
// Supported values: 'Turtle', 'TriG', 'N-Quads', 'application/ld+json'.
// Aliases (case-insensitive) must resolve to the canonical format.
// ---------------------------------------------------------------------------

interface SerializeFormatInput {
  readonly format:   string | undefined;
  readonly pipeline: readonly string[];
  readonly colors:   readonly string[];
  readonly roles:    RoleSchemaInterfaceType;
}
interface SerializeFormatOutput {
  readonly serialized: string;
  readonly graphPresent: boolean;
}

const serializeFormatScenarios: readonly ScenarioInterface<SerializeFormatInput, SerializeFormatOutput>[] = [
  {
    name: 'no format specified defaults to Turtle (starts with @prefix or IRI)',
    kind: 'happy',
    input: {
      format:   undefined,
      pipeline: ['intake:hex', 'resolve:roles', 'reason:annotate', 'reason:serialize'],
      colors:   ['#5b21b6', '#ffffff'],
      roles:    SIMPLE_ROLES,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=default-turtle] no throw');
      assert.strictEqual(output!.graphPresent, true, '[cell=4, scenario=default-turtle] graph present');
      assert.ok(output!.serialized.length > 0, '[cell=4, scenario=default-turtle] non-empty output');
      // Turtle: contains angle-bracket IRIs or @prefix lines
      assert.ok(
        output!.serialized.includes('<https://') || output!.serialized.includes('@prefix'),
        '[cell=4, scenario=default-turtle] Turtle IRI or prefix present',
      );
    },
  },
  {
    name: 'format "Turtle" (exact) serializes Turtle',
    kind: 'happy',
    input: {
      format:   'Turtle',
      pipeline: ['intake:hex', 'resolve:roles', 'reason:annotate', 'reason:serialize'],
      colors:   ['#5b21b6', '#ffffff'],
      roles:    SIMPLE_ROLES,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=turtle-explicit] no throw');
      assert.ok(output!.serialized.length > 0, '[cell=4, scenario=turtle-explicit] non-empty Turtle output');
      assert.ok(
        output!.serialized.includes('<https://') || output!.serialized.includes('@prefix'),
        '[cell=4, scenario=turtle-explicit] Turtle IRI form',
      );
    },
  },
  {
    name: 'format "N-Quads" serializes N-Quads (each line is a quad)',
    kind: 'happy',
    input: {
      format:   'N-Quads',
      pipeline: ['intake:hex', 'resolve:roles', 'reason:annotate', 'reason:serialize'],
      colors:   ['#5b21b6', '#ffffff'],
      roles:    SIMPLE_ROLES,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=nquads] no throw');
      assert.ok(output!.serialized.length > 0, '[cell=4, scenario=nquads] non-empty output');
      // N-Quads: every non-empty line must end with " .\n" or ".\n"
      const nonEmpty = output!.serialized.split('\n').filter((l) => l.trim().length > 0);
      assert.ok(nonEmpty.length > 0, '[cell=4, scenario=nquads] has lines');
      for (const line of nonEmpty) {
        assert.ok(line.endsWith(' .') || line.endsWith('.'), `[cell=4, scenario=nquads] N-Quads line ends with dot: ${line}`);
      }
    },
  },
  {
    name: 'format alias "n-quads" (lowercase) resolves to N-Quads',
    kind: 'edge',
    input: {
      format:   'n-quads',
      pipeline: ['intake:hex', 'resolve:roles', 'reason:annotate', 'reason:serialize'],
      colors:   ['#5b21b6', '#ffffff'],
      roles:    SIMPLE_ROLES,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=nquads-alias] no throw');
      assert.ok(output!.serialized.length > 0, '[cell=4, scenario=nquads-alias] non-empty output');
      const nonEmpty = output!.serialized.split('\n').filter((l) => l.trim().length > 0);
      assert.ok(nonEmpty.length > 0, '[cell=4, scenario=nquads-alias] has lines');
      for (const line of nonEmpty) {
        assert.ok(line.endsWith(' .') || line.endsWith('.'), `[cell=4, scenario=nquads-alias] line ends with dot: ${line}`);
      }
    },
  },
  {
    name: 'format alias "application/n-quads" resolves to N-Quads',
    kind: 'edge',
    input: {
      format:   'application/n-quads',
      pipeline: ['intake:hex', 'resolve:roles', 'reason:annotate', 'reason:serialize'],
      colors:   ['#5b21b6', '#ffffff'],
      roles:    SIMPLE_ROLES,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=nquads-mime] no throw');
      assert.ok(output!.serialized.length > 0, '[cell=4, scenario=nquads-mime] non-empty output');
      const nonEmpty = output!.serialized.split('\n').filter((l) => l.trim().length > 0);
      for (const line of nonEmpty) {
        assert.ok(line.endsWith(' .') || line.endsWith('.'), `[cell=4, scenario=nquads-mime] line ends with dot: ${line}`);
      }
    },
  },
  {
    name: 'unknown format string falls back to Turtle (no throw)',
    kind: 'edge',
    input: {
      format:   'INVALID_FORMAT_XYZ',
      pipeline: ['intake:hex', 'resolve:roles', 'reason:annotate', 'reason:serialize'],
      colors:   ['#5b21b6', '#ffffff'],
      roles:    SIMPLE_ROLES,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=unknown-format] no throw on unknown format');
      assert.ok(output!.serialized.length > 0, '[cell=4, scenario=unknown-format] still produces Turtle fallback');
      assert.ok(
        output!.serialized.includes('<https://') || output!.serialized.includes('@prefix'),
        '[cell=4, scenario=unknown-format] fallback is Turtle-shaped',
      );
    },
  },
  {
    name: 'non-string format value (number) falls back to Turtle',
    kind: 'edge',
    input: {
      format:   42 as unknown as string,
      pipeline: ['intake:hex', 'resolve:roles', 'reason:annotate', 'reason:serialize'],
      colors:   ['#5b21b6', '#ffffff'],
      roles:    SIMPLE_ROLES,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=non-string-format] no throw');
      assert.ok(output!.serialized.length > 0, '[cell=4, scenario=non-string-format] non-empty output');
    },
  },
];

new ScenarioRunner<SerializeFormatInput, SerializeFormatOutput>(
  'RdfPlugin :: cell-4 :: reason:serialize',
  async (input) => {
    const engine = freshEngine();
    engine.pipeline(input.pipeline);
    const runInput: InputInterface = {
      'bypass':    undefined,
      'colors':    input.colors as InputInterface['colors'],
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  input.format !== undefined ? { 'rdf:format': input.format } : undefined,
      'roles':     input.roles,
      'runtime':   undefined,
    };
    const state = await engine.run(runInput);
    return {
      serialized:   (state.outputs['rdf:serialized'] as string | undefined) ?? '',
      graphPresent: state.outputs['rdf:reasoningGraph'] !== undefined,
    };
  },
).run(serializeFormatScenarios);

// ---------------------------------------------------------------------------
// Cell 5 — RDF content correctness
//
// Verifies the semantic content of the emitted Turtle: role IRIs, color IRIs,
// rdf:type declarations, oklch/rgb decimal-literal channel triples (no blank
// nodes), hex literals, wide-gamut P3 channel triples with correct
// cardinality, and sRGB-only guards.
// ---------------------------------------------------------------------------

interface RdfContentInput {
  readonly colors:   readonly (string | { l: number; c: number; h: number })[];
  readonly roles:    RoleSchemaInterfaceType;
  readonly pipeline: readonly string[];
}
interface RdfContentOutput {
  readonly ttl:   string;
  readonly state: PaletteStateInterface;
}

const rdfContentScenarios: readonly ScenarioInterface<RdfContentInput, RdfContentOutput>[] = [
  {
    name: 'role IRIs follow iridis/role/{name} pattern',
    kind: 'happy',
    input: {
      colors:   ['#5b21b6', '#ffffff'],
      roles:    SIMPLE_ROLES,
      pipeline: ['intake:hex', 'resolve:roles', 'reason:annotate', 'reason:serialize'],
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=role-iris] no throw');
      assert.match(
        output!.ttl,
        /https:\/\/studnicky\.dev\/iridis\/role\/primary/,
        '[cell=5, scenario=role-iris] primary role IRI present',
      );
      assert.match(
        output!.ttl,
        /https:\/\/studnicky\.dev\/iridis\/role\/background/,
        '[cell=5, scenario=role-iris] background role IRI present',
      );
    },
  },
  {
    name: 'color IRIs follow iridis/color/{hex-without-hash} pattern',
    kind: 'happy',
    input: {
      colors:   ['#5b21b6', '#ffffff'],
      roles:    SIMPLE_ROLES,
      pipeline: ['intake:hex', 'resolve:roles', 'reason:annotate', 'reason:serialize'],
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=color-iris] no throw');
      // hex is canonicalized by intake:hex — match whatever the resolved hex is
      assert.match(
        output!.ttl,
        /https:\/\/studnicky\.dev\/iridis\/color\//,
        '[cell=5, scenario=color-iris] color IRI namespace present',
      );
      // Turtle must not contain the '#' fragment in the color IRI (hash stripped)
      const colorIriSection = output!.ttl.match(/iridis\/color\/([^\s>]+)/g) ?? [];
      for (const iriPart of colorIriSection) {
        assert.ok(!iriPart.includes('#'), `[cell=5, scenario=color-iris] IRI fragment has no # sign: ${iriPart}`);
      }
    },
  },
  {
    name: 'rdf:type Role triple emitted for each role',
    kind: 'happy',
    input: {
      colors:   ['#5b21b6', '#ffffff'],
      roles:    SIMPLE_ROLES,
      pipeline: ['intake:hex', 'resolve:roles', 'reason:annotate', 'reason:serialize'],
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=rdf-type] no throw');
      // n3 Writer serializes rdf:type as `a` keyword in Turtle
      const typeCount = (output!.ttl.match(/\ba\s+<https:\/\/studnicky\.dev\/iridis#Role>/g) ?? []).length;
      assert.strictEqual(typeCount, 2, '[cell=5, scenario=rdf-type] two rdf:type Role triples (one per role)');
    },
  },
  {
    // ReasonAnnotate emits oklchL/oklchC/oklchH and rgbR/rgbG/rgbB as real
    // xsd:decimal literals directly on the color IRI subject — never a
    // blank node. Each *distinct* resolved color IRI gets exactly one
    // triple per channel predicate (6 channel predicates total), so with
    // two distinct colors each channel predicate appears twice, and no
    // `_:n3-` blank-node lines appear anywhere in the Turtle.
    name: 'oklch + rgb channel triples emitted for each distinct resolved color (no blank nodes)',
    kind: 'happy',
    input: {
      // Provide two colours with distinct OKLCH targets so the resolver maps
      // each role to a different color IRI, yielding 2 color nodes × 6
      // channel predicates (oklchL/C/H, rgbR/G/B) in the Turtle.
      colors: [
        { l: 0.45, c: 0.18, h: 270 },  // violet-ish → primary
        { l: 0.10, c: 0.01, h: 270 },  // near-black → background
      ],
      roles: {
        'contrastPairs': undefined,
        'description':   undefined,
        name: 'two-distinct',
        roles: [
          { name: 'primary',    required: true, lightnessRange: [0.35, 0.60], chromaRange: [0.10, 0.30], 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined },
          { name: 'background', required: true, lightnessRange: [0.05, 0.20], chromaRange: [0.00, 0.05], 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined },
        ],
      },
      pipeline: ['intake:oklch', 'resolve:roles', 'reason:annotate', 'reason:serialize'],
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=channel-literals] no throw');
      const blankCount = output!.ttl.split('\n').filter((l) => l.includes('_:n3-')).length;
      assert.strictEqual(blankCount, 0, '[cell=5, scenario=channel-literals] no blank nodes anywhere in Turtle');
      for (const predicate of ['oklchL', 'oklchC', 'oklchH', 'rgbR', 'rgbG', 'rgbB']) {
        const count = (output!.ttl.match(new RegExp(predicate, 'g')) ?? []).length;
        assert.strictEqual(count, 2, `[cell=5, scenario=channel-literals] two ${predicate} triples (2 distinct color IRIs)`);
      }
    },
  },
  {
    // hex literal triples are emitted per distinct resolved color IRI.
    // When roles share a color IRI, one hex triple covers both roles.
    name: 'hex literal triple emitted for each distinct resolved color IRI',
    kind: 'happy',
    input: {
      colors: [
        { l: 0.45, c: 0.18, h: 270 },
        { l: 0.10, c: 0.01, h: 270 },
      ],
      roles: {
        'contrastPairs': undefined,
        'description':   undefined,
        name: 'two-distinct',
        roles: [
          { name: 'primary',    required: true, lightnessRange: [0.35, 0.60], chromaRange: [0.10, 0.30], 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined },
          { name: 'background', required: true, lightnessRange: [0.05, 0.20], chromaRange: [0.00, 0.05], 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined },
        ],
      },
      pipeline: ['intake:oklch', 'resolve:roles', 'reason:annotate', 'reason:serialize'],
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=hex-literal] no throw');
      assert.match(output!.ttl, /iridis#hex/, '[cell=5, scenario=hex-literal] hex predicate in Turtle');
      const hexLiteralCount = (output!.ttl.match(/iridis#hex/g) ?? []).length;
      // Two distinct colors → two hex literal triples
      assert.strictEqual(hexLiteralCount, 2, '[cell=5, scenario=hex-literal] one hex triple per distinct color IRI');
    },
  },
  {
    name: 'sRGB-only hex input produces no displayP3R/G/B triples',
    kind: 'happy',
    input: {
      colors:   ['#5b21b6', '#ffffff'],
      roles:    SIMPLE_ROLES,
      pipeline: ['intake:hex', 'resolve:roles', 'reason:annotate', 'reason:serialize'],
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=srgb-only] no throw');
      assert.ok(!output!.ttl.includes('displayP3R'), '[cell=5, scenario=srgb-only] no P3R triple');
      assert.ok(!output!.ttl.includes('displayP3G'), '[cell=5, scenario=srgb-only] no P3G triple');
      assert.ok(!output!.ttl.includes('displayP3B'), '[cell=5, scenario=srgb-only] no P3B triple');
    },
  },
  {
    name: 'wide-gamut OKLCH accent emits exactly 3 P3 channel triples; in-sRGB background emits 0',
    kind: 'happy',
    input: {
      // OKLCH(0.7, 0.4, 30) — out-of-sRGB vivid red-orange
      // OKLCH(0.10, 0.01, 280) — near-black, in sRGB gamut
      colors:   [{ l: 0.7, c: 0.4, h: 30 }, { l: 0.10, c: 0.01, h: 280 }],
      roles:    WIDE_GAMUT_ROLES,
      pipeline: ['intake:oklch', 'resolve:roles', 'reason:annotate', 'reason:serialize'],
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=p3-channels] no throw');
      const accent     = output!.state.roles['accent'];
      const background = output!.state.roles['background'];
      assert.ok(accent !== undefined,                  '[cell=5, scenario=p3-channels] accent role resolved');
      assert.ok(background !== undefined,              '[cell=5, scenario=p3-channels] background role resolved');
      assert.ok(accent.displayP3 !== undefined,        '[cell=5, scenario=p3-channels] accent has P3 record');
      assert.ok(background.displayP3 === undefined,    '[cell=5, scenario=p3-channels] background has no P3 record');

      const p3Count =
        (output!.ttl.match(/displayP3R/g) ?? []).length +
        (output!.ttl.match(/displayP3G/g) ?? []).length +
        (output!.ttl.match(/displayP3B/g) ?? []).length;
      assert.strictEqual(p3Count, 3, '[cell=5, scenario=p3-channels] exactly 3 P3 channel triples (accent only)');
    },
  },
  {
    name: 'P3 channel literal values in Turtle match accent.displayP3 at 4dp',
    kind: 'happy',
    input: {
      colors:   [{ l: 0.7, c: 0.4, h: 30 }, { l: 0.10, c: 0.01, h: 280 }],
      roles:    WIDE_GAMUT_ROLES,
      pipeline: ['intake:oklch', 'resolve:roles', 'reason:annotate', 'reason:serialize'],
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=p3-literals] no throw');
      const accent = output!.state.roles['accent'];
      assert.ok(accent?.displayP3 !== undefined, '[cell=5, scenario=p3-literals] accent has P3');
      const r4 = accent.displayP3!.r.toFixed(4);
      const g4 = accent.displayP3!.g.toFixed(4);
      const b4 = accent.displayP3!.b.toFixed(4);
      assert.match(output!.ttl, new RegExp(`displayP3R[^.]*\\s${r4}\\b`), `[cell=5, scenario=p3-literals] P3R literal ${r4}`);
      assert.match(output!.ttl, new RegExp(`displayP3G[^.]*\\s${g4}\\b`), `[cell=5, scenario=p3-literals] P3G literal ${g4}`);
      assert.match(output!.ttl, new RegExp(`displayP3B[^.]*\\s${b4}\\b`), `[cell=5, scenario=p3-literals] P3B literal ${b4}`);
    },
  },
  {
    name: 'palette IRI is present in Turtle output and includes run- prefix',
    kind: 'edge',
    input: {
      colors:   ['#5b21b6', '#ffffff'],
      roles:    SIMPLE_ROLES,
      pipeline: ['intake:hex', 'resolve:roles', 'reason:annotate', 'reason:serialize'],
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=palette-iri] no throw');
      assert.match(
        output!.ttl,
        /iridis\/palette\/run-\d+/,
        '[cell=5, scenario=palette-iri] palette run IRI contains timestamp',
      );
    },
  },
  {
    name: 'contrast pair IRI follows iridis/pair/{fg}-on-{bg} pattern',
    kind: 'edge',
    input: {
      colors:   ['#5b21b6', '#ffffff'],
      roles:    SIMPLE_ROLES,
      pipeline: ['intake:hex', 'resolve:roles', 'reason:annotate', 'reason:serialize'],
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=pair-iri] no throw');
      assert.match(
        output!.ttl,
        /iridis\/pair\/primary-on-background/,
        '[cell=5, scenario=pair-iri] primary-on-background pair IRI',
      );
      assert.match(
        output!.ttl,
        /iridis\/pair\/background-on-primary/,
        '[cell=5, scenario=pair-iri] background-on-primary pair IRI',
      );
    },
  },
  {
    name: 'wcag21Ratio literal is a numeric decimal value',
    kind: 'edge',
    input: {
      colors:   ['#5b21b6', '#ffffff'],
      roles:    SIMPLE_ROLES,
      pipeline: ['intake:hex', 'resolve:roles', 'reason:annotate', 'reason:serialize'],
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=wcag-literal] no throw');
      // n3 Writer emits bare decimal literals ending with `.` when using xsd:decimal
      assert.match(
        output!.ttl,
        /wcag21Ratio>\s[\d.]+\./,
        '[cell=5, scenario=wcag-literal] wcag21Ratio is a decimal literal',
      );
    },
  },
];

new ScenarioRunner<RdfContentInput, RdfContentOutput>(
  'RdfPlugin :: cell-5 :: rdf-content',
  async (input) => {
    const engine = freshEngine();
    engine.pipeline(input.pipeline);
    const state = await engine.run({
      'bypass':    undefined,
      'colors':    input.colors as InputInterface['colors'],
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  undefined,
      'roles':     input.roles,
      'runtime':   undefined,
    });
    return {
      ttl:   (state.outputs['rdf:serialized'] as string | undefined) ?? '',
      state,
    };
  },
).run(rdfContentScenarios);

// ---------------------------------------------------------------------------
// Cell 6 — reason:serialize skips gracefully when graph is absent
//
// If reason:annotate has not run (outputs.reasoning.graph is undefined),
// reason:serialize MUST NOT throw and must leave outputs.reasoning.serialized
// undefined (no partial write). This guards against out-of-order pipelines.
// ---------------------------------------------------------------------------

interface MissingGraphInput  { readonly dummy: true }
interface MissingGraphOutput {
  readonly serializedPresent: boolean;
  readonly graphPresent:      boolean;
}

const missingGraphScenarios: readonly ScenarioInterface<MissingGraphInput, MissingGraphOutput>[] = [
  {
    name: 'reason:serialize without prior reason:annotate skips and leaves serialized undefined',
    kind: 'unhappy',
    input: { dummy: true },
    assert(output, error) {
      // Must NOT throw — silent skip is the documented contract
      assert.strictEqual(error, undefined,                  '[cell=6, scenario=missing-graph] no throw');
      assert.strictEqual(output!.serializedPresent, false,  '[cell=6, scenario=missing-graph] serialized not written');
      assert.strictEqual(output!.graphPresent,      false,  '[cell=6, scenario=missing-graph] graph absent from state');
    },
  },
];

new ScenarioRunner<MissingGraphInput, MissingGraphOutput>(
  'RdfPlugin :: cell-6 :: serialize-missing-graph',
  async (_input) => {
    const engine = freshEngine();
    // Intentionally omit reason:annotate — serialize with no graph
    engine.pipeline(['intake:hex', 'resolve:roles', 'reason:serialize']);
    const state = await engine.run({
      'bypass':    undefined,
      'colors':    ['#5b21b6', '#ffffff'],
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  undefined,
      'roles':     SIMPLE_ROLES,
      'runtime':   undefined,
    });
    return {
      serializedPresent: state.outputs['rdf:serialized'] !== undefined,
      graphPresent:      state.outputs['rdf:reasoningGraph'] !== undefined,
    };
  },
).run(missingGraphScenarios);

// ---------------------------------------------------------------------------
// Golden fixture
//
// Locks the Turtle output of intake:hex → resolve:roles → reason:annotate →
// reason:serialize for a stable seed + role schema. Palette IRI (Date.now
// based) is filtered before comparison. ReasonAnnotate emits oklch/rgb as
// real xsd:decimal literals directly on the color IRI subject — never a
// blank node — so no blank-node filtering or count assertion is needed.
// Regenerate with UPDATE_GOLDENS=1 after an intentional change to
// ReasonAnnotate or ReasonSerialize.
// ---------------------------------------------------------------------------

test('reason:serialize :: golden :: stable seed matches locked Turtle fixture (palette IRI filtered)', async () => {
  const engine = freshEngine();
  engine.pipeline([
    'intake:hex',
    'resolve:roles',
    'reason:annotate',
    'reason:serialize',
  ]);

  const state = await engine.run({
    'bypass':    undefined,
    'colors':    ['#5b21b6', '#0f172a'],
    'contrast':  undefined,
    'emit':      undefined,
    'maxColors': undefined,
    'metadata':  undefined,
    'roles':     GOLDEN_ROLES,
    'runtime':   undefined,
  });

  const ttl = state.outputs['rdf:serialized'] as string | undefined;
  assert.ok(ttl !== undefined, 'serialized Turtle present');

  // ReasonAnnotate no longer emits blank nodes anywhere in the graph.
  const blankRefCount = ttl.split('\n').filter((l) => l.includes('_:n3-')).length;
  assert.strictEqual(
    blankRefCount,
    0,
    `[golden] expected no blank-node lines (oklch/rgb are real decimal literals), got ${blankRefCount}`,
  );

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
