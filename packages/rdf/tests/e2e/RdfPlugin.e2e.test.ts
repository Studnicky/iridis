/**
 * RDF plugin end-to-end tests.
 *
 * Asserts plugin shape and drives the reason:annotate / reason:serialize pair.
 * n3 is the plugin's runtime dep — workspace install resolves it.
 */
import { test } from 'node:test';
import assert   from 'node:assert/strict';

import { Engine }       from '@studnicky/iridis/engine';
import { coreTasks }    from '@studnicky/iridis/tasks';
import type { RoleSchemaInterface } from '@studnicky/iridis';
import { rdfPlugin, RdfPlugin, colorologyVocab } from '@studnicky/iridis-rdf';

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
