import type { PaletteStateInterface, TaskInterface } from '@studnicky/iridis';

import {
  InputInterfaceTypeEntity,
  Metadata,
  RoleProvenanceInterfaceTypeEntity,
  RoleSchemaInterfaceTypeEntity,
  TaskManifestInterfaceTypeEntity
} from '@studnicky/iridis';
import { iridisVocab, rdfPlugin } from '@studnicky/iridis-rdf';
import { Engine }    from '@studnicky/iridis/engine';
import { coreTasks } from '@studnicky/iridis/tasks';
import { DataFactory, Parser, Store } from 'n3';
import assert from 'node:assert/strict';
import { test } from 'node:test';

class ProvenanceFixtureTask implements TaskInterface {
  readonly 'name' = 'test:install-provenance';

  readonly 'manifest' = TaskManifestInterfaceTypeEntity.create({
    'description': 'Install controlled canonical role provenance for RDF annotation tests',
    'name':        'test:install-provenance',
    'reads':       ['roles'],
    'writes':      ["metadata['core:roleProvenance']"]
  });

  run(state: PaletteStateInterface): void {
    const derived = state.roles.derived;
    if (derived === undefined) {
      throw new Error('derived role must resolve before provenance installation');
    }
    const provenance = new Map([
      ['derived', RoleProvenanceInterfaceTypeEntity.create({
        'adjustments': [{
          'afterHex':  derived.hex,
          'beforeHex': '#010203',
          'operation': 'role-range'
        }],
        'origin': 'derived'
      })],
      ['stated', RoleProvenanceInterfaceTypeEntity.create({
        'adjustments': [],
        'origin':      'stated'
      })]
    ]);
    Metadata.writeRoleProvenance(state.metadata, provenance);
  }
}

class RdfProvenanceFixture {
  static run(): Store {
    const engine = new Engine();
    for (let taskIndex = 0; taskIndex < coreTasks.length; taskIndex += 1) {
      const task = coreTasks.at(taskIndex);
      if (task !== undefined) {
        engine.tasks.register(task);
      }
    }
    engine.tasks.register(new ProvenanceFixtureTask());
    engine.adopt(rdfPlugin);
    engine.pipeline(['intake:hex', 'resolve:roles', 'test:install-provenance', 'reason:annotate']);

    const state = engine.run(InputInterfaceTypeEntity.create({
      'colors': ['#a898c3', '#10161f'],
      'roles': RoleSchemaInterfaceTypeEntity.create({
        'name': 'rdf-provenance',
        'roles': [
          { 'name': 'stated', 'required': true },
          { 'name': 'derived', 'required': true }
        ]
      })
    }));
    const serializedGraph = state.outputs['rdf:reasoningGraph'];
    if (typeof serializedGraph !== 'string') {
      throw new Error('reason:annotate must emit an N-Quads string');
    }
    const graph = new Store(new Parser({ 'format': 'N-Quads' }).parse(serializedGraph));
    return graph;
  }
}

void test('reason:annotate emits canonical stated and derived provenance without legacy metadata', () => {
  const graph = RdfProvenanceFixture.run();
  const stated = DataFactory.namedNode('https://studnicky.dev/iridis/role/stated');
  const derived = DataFactory.namedNode('https://studnicky.dev/iridis/role/derived');
  const origin = DataFactory.namedNode(iridisVocab.resolutionOrigin);
  const hasAdjustment = DataFactory.namedNode(iridisVocab.hasAdjustment);

  assert.strictEqual(
    graph.countQuads(stated, origin, DataFactory.literal('stated'), null),
    1,
    'stated role has canonical stated origin'
  );
  assert.strictEqual(
    graph.countQuads(stated, DataFactory.namedNode(iridisVocab.pinned), DataFactory.literal('true', DataFactory.namedNode('http://www.w3.org/2001/XMLSchema#boolean')), null),
    1,
    'stated role retains the compatibility provenance predicate'
  );
  assert.strictEqual(graph.countQuads(stated, hasAdjustment, null, null), 0, 'stated role has no adjustment claim');
  assert.strictEqual(graph.countQuads(stated, DataFactory.namedNode(iridisVocab.derivedFrom), null, null), 0, 'stated role has no derivation claim');

  const adjustments = graph.getQuads(derived, hasAdjustment, null, null);
  assert.strictEqual(adjustments.length, 1, 'derived role links to its canonical adjustment');
  const adjustment = adjustments[0]?.object;
  assert.ok(adjustment !== undefined, 'derived role adjustment is present');
  assert.strictEqual(
    graph.countQuads(derived, origin, DataFactory.literal('derived'), null),
    1,
    'derived role has canonical derived origin'
  );
  assert.strictEqual(
    graph.countQuads(adjustment, DataFactory.namedNode(iridisVocab.adjustedFrom), DataFactory.namedNode('https://studnicky.dev/iridis/color/010203'), null),
    1,
    'adjustment links its exact before color'
  );
  const resolvedColor = graph.getQuads(derived, DataFactory.namedNode(iridisVocab.hasColor), null, null)[0]?.object;
  assert.ok(resolvedColor !== undefined, 'derived role has a resolved color');
  assert.strictEqual(
    graph.countQuads(adjustment, DataFactory.namedNode(iridisVocab.adjustedTo), resolvedColor, null),
    1,
    'adjustment links its exact resolved color'
  );
  assert.strictEqual(
    graph.countQuads(adjustment, DataFactory.namedNode(iridisVocab.adjustmentOperation), DataFactory.literal('role-range'), null),
    1,
    'adjustment records its canonical operation'
  );
});
