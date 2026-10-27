import {
  coreTasks,
  Engine,
  InputEntity,
  RoleSchemaEntity
} from '@studnicky/iridis';
import { iridisVocab, rdfPlugin } from '@studnicky/iridis-rdf';
import { DataFactory, Parser, Store } from 'n3';
import assert from 'node:assert/strict';
import { test } from 'node:test';

class RdfHueTargetFixture {
  static graph(): Store {
    const engine = new Engine();
    for (let taskIndex = 0; taskIndex < coreTasks.length; taskIndex += 1) {
      const task = coreTasks[taskIndex];
      if (task !== undefined) {
        engine.tasks.register(task);
      }
    }
    engine.adopt(rdfPlugin);
    engine.pipeline(['intake:hex', 'resolve:roles', 'derive:roleRelations', 'reason:annotate']);
    const state = engine.run(InputEntity.intake({
      'colors': ['#7c3aed'],
      'roles': RoleSchemaEntity.intake({
        'name': 'rdf-hue-target',
        'relationshipGraph': {
          'groups': [{
            'anchor': 'brand',
            'defaultMode': 'default',
            'id': 'semantic',
            'modes': [{ 'hueOffsets': [{ 'degrees': 0, 'variantId': 'base' }], 'id': 'default' }],
            'name': 'Semantic',
            'relationships': [{
              'clamp': 90,
              'hue': 160,
              'id': 'success',
              'operation': 'hue-target',
              'priority': 0,
              'relaxability': 'fixed',
              'source': 'brand',
              'target': 'success'
            }]
          }]
        },
        'roles': [{ 'name': 'brand', 'required': true }, { 'name': 'success' }]
      })
    }));
    const serialized = state.outputs['rdf:reasoningGraph'];
    if (typeof serialized !== 'string') {
      throw new Error('reason:annotate must emit an N-Quads string');
    }
    const result = new Store(new Parser({ 'format': 'N-Quads' }).parse(serialized));
    return result;
  }
}

void test('reason:annotate projects exact hue-target parameters', () => {
  const graph = RdfHueTargetFixture.graph();
  const relationship = DataFactory.namedNode('https://studnicky.dev/iridis/relationship-graph/rdf-hue-target/group/semantic/relationship/success');
  const double = DataFactory.namedNode('http://www.w3.org/2001/XMLSchema#double');

  assert.strictEqual(
    graph.countQuads(relationship, DataFactory.namedNode(iridisVocab.hueTarget), DataFactory.literal('160', double), null),
    1,
    'relationship graph exposes the authored hue target'
  );
  assert.strictEqual(
    graph.countQuads(relationship, DataFactory.namedNode(iridisVocab.hueClamp), DataFactory.literal('90', double), null),
    1,
    'relationship graph exposes the authored hue clamp'
  );
});
