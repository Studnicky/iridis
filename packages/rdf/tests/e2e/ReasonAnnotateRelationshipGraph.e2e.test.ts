import type { PaletteStateInterface } from '@studnicky/iridis';

import {
  coreTasks,
  Engine,
  InputEntity,
  RoleSchemaEntity,
  TaskManifestEntity
} from '@studnicky/iridis';
import { iridisVocab, rdfPlugin } from '@studnicky/iridis-rdf';
import { colorRecordFactory } from '@studnicky/iridis/math';
import { DataFactory, Parser, Store } from 'n3';
import assert from 'node:assert/strict';
import { test } from 'node:test';

class RelationshipGraphRdfFixture {
  static run(): Store {
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
      'colors': ['#7c3aed', '#111827'],
      'roles': RoleSchemaEntity.intake({
        'name': 'relationship/rdf #1',
        'relationshipGraph': {
          'groups': [{
            'anchor': 'brand',
            'defaultMode': 'opposite mode/#',
            'id': 'brand/family #1',
            'modes': [{
              'hueOffsets': [{ 'degrees': 180, 'variantId': 'opposite variant/#' }],
              'id': 'opposite mode/#'
            }],
            'name': 'Brand family',
            'relationships': [
              {
                'degrees': 12.345,
                'id': 'accent/opposite #1',
                'operation': 'hue-offset',
                'priority': 0,
                'relaxability': 'tolerant',
                'source': 'brand',
                'target': 'accent',
                'tolerance': { 'hue': 0.00004 }
              },
              {
                'id': 'brand-alias',
                'operation': 'alias',
                'priority': 1,
                'relaxability': 'fixed',
                'source': 'brand',
                'target': 'alias'
              },
              {
                'chromaScale': 0.7,
                'hueOffset': 24,
                'id': 'brand-delta',
                'lightnessOffset': 0.08,
                'operation': 'oklch-delta',
                'priority': 2,
                'relaxability': 'fixed',
                'source': 'brand',
                'target': 'delta'
              },
              {
                'id': 'brand-background-interpolate',
                'operation': 'oklch-interpolate',
                'priority': 3,
                'relaxability': 'fixed',
                'source': 'brand',
                'target': 'interpolated',
                'toward': 'background',
                'weight': 0.25
              },
              {
                'alpha': 0.4,
                'base': 'background',
                'id': 'brand-overlay',
                'operation': 'alpha-overlay',
                'overlay': 'brand',
                'priority': 4,
                'relaxability': 'fixed',
                'target': 'overlay'
              }
            ]
          }]
        },
        'roles': [
          { 'name': 'brand', 'required': true },
          { 'name': 'background', 'required': true },
          { 'name': 'accent' },
          { 'name': 'alias' },
          { 'name': 'delta' },
          { 'name': 'interpolated' },
          { 'name': 'overlay' }
        ]
      })
    }));
    const result = RelationshipGraphRdfFixture.graph(state);
    return result;
  }

  static runStatedHueOffset(): Store {
    const engine = new Engine();
    for (let taskIndex = 0; taskIndex < coreTasks.length; taskIndex += 1) {
      const task = coreTasks[taskIndex];
      if (task !== undefined) {
        engine.tasks.register(task);
      }
    }
    engine.adopt(rdfPlugin);
    engine.tasks.hook({
      'manifest': TaskManifestEntity.create({ 'name': 'seed:stated-hue-offset', 'phase': 'onRunStart' }),
      'name': 'seed:stated-hue-offset',
      'run': (state: PaletteStateInterface): void => {
        state.colors.push(
          colorRecordFactory.fromHex('#7c3aed', { 'hints': { 'role': 'brand' } }),
          colorRecordFactory.fromHex('#00ff00', { 'hints': { 'role': 'accent' } })
        );
      }
    });
    engine.pipeline(['resolve:roles', 'derive:roleRelations', 'reason:annotate']);
    const state = engine.run(InputEntity.intake({
      'colors': [],
      'roles': RoleSchemaEntity.intake({
        'name': 'stated-hue-mode',
        'relationshipGraph': {
          'groups': [{
            'anchor': 'brand',
            'defaultMode': 'analogous',
            'id': 'brand-family',
            'modes': [
              { 'hueOffsets': [{ 'degrees': 30, 'variantId': 'near' }], 'id': 'analogous' },
              { 'hueOffsets': [{ 'degrees': 120, 'variantId': 'near' }], 'id': 'triadic' }
            ],
            'name': 'Brand family',
            'relationships': [{
              'id': 'accent-offset',
              'modeId': 'triadic',
              'operation': 'hue-offset',
              'priority': 0,
              'relaxability': 'fixed',
              'source': 'brand',
              'target': 'accent',
              'variantId': 'near'
            }]
          }]
        },
        'roles': [{ 'name': 'brand' }, { 'name': 'accent' }]
      })
    }));
    const result = RelationshipGraphRdfFixture.graph(state);
    return result;
  }

  private static graph(state: PaletteStateInterface): Store {
    const serialized = state.outputs['rdf:reasoningGraph'];
    if (typeof serialized !== 'string') {
      throw new Error('reason:annotate must emit an N-Quads string');
    }
    const result = new Store(new Parser({ 'format': 'N-Quads' }).parse(serialized));
    return result;
  }
}

void test('reason:annotate preserves an explicit hue-offset mode for a stated target', () => {
  const graph = RelationshipGraphRdfFixture.runStatedHueOffset();
  const resolution = DataFactory.namedNode('https://studnicky.dev/iridis/role/accent/relationship-resolution');
  const triadic = DataFactory.namedNode('https://studnicky.dev/iridis/relationship-graph/stated-hue-mode/group/brand-family/mode/triadic');

  assert.strictEqual(
    graph.countQuads(resolution, DataFactory.namedNode(iridisVocab.resolutionMode), triadic, null),
    1,
    'stated target resolution retains the relationship mode rather than the group default'
  );
});

void test('reason:annotate projects authored relationship graphs and resolved role explanations', () => {
  const graph = RelationshipGraphRdfFixture.run();
  const graphNode = DataFactory.namedNode('https://studnicky.dev/iridis/relationship-graph/relationship%2Frdf%20%231');
  const group = DataFactory.namedNode('https://studnicky.dev/iridis/relationship-graph/relationship%2Frdf%20%231/group/brand%2Ffamily%20%231');
  const relationship = DataFactory.namedNode('https://studnicky.dev/iridis/relationship-graph/relationship%2Frdf%20%231/group/brand%2Ffamily%20%231/relationship/accent%2Fopposite%20%231');
  const brand = DataFactory.namedNode('https://studnicky.dev/iridis/role/brand');
  const accent = DataFactory.namedNode('https://studnicky.dev/iridis/role/accent');
  const resolution = DataFactory.namedNode('https://studnicky.dev/iridis/role/accent/relationship-resolution');

  assert.strictEqual(
    graph.countQuads(null, DataFactory.namedNode(iridisVocab.hasRelationshipGraph), graphNode, null),
    1,
    'palette links its authored relationship graph'
  );
  assert.strictEqual(
    graph.countQuads(graphNode, DataFactory.namedNode(iridisVocab.hasRelationshipGroup), group, null),
    1,
    'graph links its authored group'
  );
  assert.strictEqual(
    graph.countQuads(relationship, DataFactory.namedNode(iridisVocab.relationshipSource), brand, null),
    1,
    'reverse reachability starts at a relationship source'
  );
  assert.strictEqual(
    graph.countQuads(relationship, DataFactory.namedNode(iridisVocab.relationshipTarget), accent, null),
    1,
    'reverse reachability reaches the derived target'
  );
  assert.strictEqual(
    graph.countQuads(accent, DataFactory.namedNode(iridisVocab.hasRelationshipResolution), resolution, null),
    1,
    'resolved role links its relationship explanation'
  );
  assert.strictEqual(
    graph.countQuads(resolution, DataFactory.namedNode(iridisVocab.resolutionRelationship), relationship, null),
    1,
    'resolution links the authored operation that produced the role'
  );
  assert.strictEqual(
    graph.countQuads(resolution, DataFactory.namedNode(iridisVocab.resolutionSource), brand, null),
    1,
    'resolution retains its source role for explanation traversal'
  );
  assert.strictEqual(
    graph.countQuads(resolution, DataFactory.namedNode(iridisVocab.resolutionBefore), null, null),
    1,
    'resolution retains its exact derivation baseline color'
  );
  assert.strictEqual(
    graph.countQuads(resolution, DataFactory.namedNode(iridisVocab.resolutionAfter), null, null),
    1,
    'resolution retains its exact derived color'
  );
  assert.strictEqual(
    graph.countQuads(relationship, DataFactory.namedNode(iridisVocab.relationshipTolerance), null, null),
    1,
    'tolerant relationship links a queryable tolerance resource'
  );
  const tolerance = graph.getQuads(relationship, DataFactory.namedNode(iridisVocab.relationshipTolerance), null, null)[0]?.object;
  assert.ok(tolerance !== undefined, 'tolerant relationship exposes its tolerance resource');
  assert.strictEqual(
    graph.countQuads(relationship, DataFactory.namedNode(iridisVocab.hueDegrees), DataFactory.literal('12.345', DataFactory.namedNode('http://www.w3.org/2001/XMLSchema#double')), null),
    1,
    'hue degrees retain the exact authored number'
  );
  const authoredHue = graph.getQuads(relationship, DataFactory.namedNode(iridisVocab.hueDegrees), null, null)[0]?.object;
  if (authoredHue?.termType !== 'Literal') {
    throw new Error('hue degrees are an RDF literal');
  }
  assert.ok(Math.abs(Number(authoredHue.value) - 12.345) < Number.EPSILON, 'hue degrees round-trip to the authored number');
  assert.strictEqual(
    graph.countQuads(tolerance, DataFactory.namedNode(iridisVocab.toleranceHue), DataFactory.literal('0.00004', DataFactory.namedNode('http://www.w3.org/2001/XMLSchema#double')), null),
    1,
    'tolerance retains the exact authored number'
  );

  const double = DataFactory.namedNode('http://www.w3.org/2001/XMLSchema#double');

  const deltaRelationship = DataFactory.namedNode('https://studnicky.dev/iridis/relationship-graph/relationship%2Frdf%20%231/group/brand%2Ffamily%20%231/relationship/brand-delta');
  const interpolationRelationship = DataFactory.namedNode('https://studnicky.dev/iridis/relationship-graph/relationship%2Frdf%20%231/group/brand%2Ffamily%20%231/relationship/brand-background-interpolate');
  const overlayRelationship = DataFactory.namedNode('https://studnicky.dev/iridis/relationship-graph/relationship%2Frdf%20%231/group/brand%2Ffamily%20%231/relationship/brand-overlay');

  assert.strictEqual(
    graph.countQuads(deltaRelationship, DataFactory.namedNode(iridisVocab.lightnessOffset), DataFactory.literal('0.08', double), null),
    1,
    'OKLCH delta exposes its authored lightness offset'
  );
  assert.strictEqual(
    graph.countQuads(deltaRelationship, DataFactory.namedNode(iridisVocab.chromaScale), DataFactory.literal('0.7', double), null),
    1,
    'OKLCH delta exposes its authored chroma scale'
  );
  assert.strictEqual(
    graph.countQuads(deltaRelationship, DataFactory.namedNode(iridisVocab.hueOffset), DataFactory.literal('24', double), null),
    1,
    'OKLCH delta exposes its authored hue offset'
  );
  assert.strictEqual(
    graph.countQuads(interpolationRelationship, DataFactory.namedNode(iridisVocab.interpolationWeight), DataFactory.literal('0.25', double), null),
    1,
    'OKLCH interpolation exposes its authored weight'
  );
  assert.strictEqual(
    graph.countQuads(overlayRelationship, DataFactory.namedNode(iridisVocab.overlayAlpha), DataFactory.literal('0.4', double), null),
    1,
    'alpha overlay exposes its authored alpha'
  );
});
