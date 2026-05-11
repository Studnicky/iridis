/**
 * RDF plugin end-to-end tests.
 *
 * Asserts plugin shape and drives the reason:annotate / reason:serialize pair.
 * n3 is the plugin's runtime dep — workspace install resolves it.
 */
import { test } from 'node:test';
import assert   from 'node:assert/strict';

import { Engine }       from '@studnicky/iridis/engine';
import { mathBuiltins } from '@studnicky/iridis/math';
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
  for (const m of mathBuiltins) engine.math.register(m);
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

  assert.ok(state.graph !== undefined, 'reason:annotate populated state.graph');
});
