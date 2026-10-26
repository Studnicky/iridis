import type { RoleRelationshipEntity } from '@studnicky/iridis';

import {
  colorRecordFactory,
  ContrastOptionsEntity,
  contrastWcag21,
  InputEntity,
  Metadata,
  RelationshipResolutionEntity,
  RoleDefinitionEntity,
  RoleProvenanceEntity,
  RoleSchemaEntity,
  RuntimeOptionsEntity
} from '@studnicky/iridis';
import { ContrastFeasibility, ContrastPairFeasibilityEntity } from '@studnicky/iridis-contrast';
import assert from 'node:assert/strict';
import { test } from 'node:test';

class ContrastFeasibilityFixture {
  static readonly #hues = new WeakMap<RoleDefinitionEntity.Type, number>();

  static options(): ContrastOptionsEntity.Type {
    const result = ContrastOptionsEntity.intake({ 'algorithm': 'wcag21', 'level': 'AA' });
    return result;
  }

  static role(
    name: string,
    lightness: number,
    chroma: number,
    hue?: number
  ): RoleDefinitionEntity.Type {
    const result = RoleDefinitionEntity.intake({
      'chromaRange': [chroma, chroma],
      'lightnessRange': [lightness, lightness],
      'name': name
    });
    if (hue !== undefined) {
      ContrastFeasibilityFixture.#hues.set(result, hue);
    }
    return result;
  }

  static schema(
    foreground: RoleDefinitionEntity.Type,
    background: RoleDefinitionEntity.Type,
    minimumContrastRatio: number
  ): RoleSchemaEntity.Type {
    const roles = [foreground, background];
    const relationships = roles.flatMap((role, priority) => {
      const hue = ContrastFeasibilityFixture.#hues.get(role);
      const result = hue === undefined ? [] : [{
        'clamp': 180,
        'hue': hue,
        'id': `fixed-hue-${role.name}`,
        'operation': 'hue-target',
        'priority': priority,
        'relaxability': 'fixed',
        'target': role.name
      }];
      return result;
    });
    const result = RoleSchemaEntity.intake({
      'contrastPairs': [{
        'background': background.name,
        'foreground': foreground.name,
        'minimumContrastRatio': minimumContrastRatio
      }],
      'name': 'contrast-feasibility',
      ...(relationships.length === 0 ? {} : {
        'relationshipGraph': {
          'groups': [{
            'anchor': foreground.name,
            'defaultMode': 'fixed',
            'id': 'fixed-hues',
            'modes': [{ 'hueOffsets': [{ 'degrees': 0, 'variantId': 'fixed' }], 'id': 'fixed' }],
            'name': 'Fixed hues',
            'relationships': relationships
          }]
        }
      }),
      'roles': roles
    });
    return result;
  }
}

await test('ContrastFeasibility classifies fixed production-record envelopes as always reachable', () => {
  const schema = ContrastFeasibilityFixture.schema(
    ContrastFeasibilityFixture.role('foreground', 0.9, 0.1, 120),
    ContrastFeasibilityFixture.role('background', 0.1, 0.1, 120),
    4.5
  );

  const report = ContrastFeasibility.analyzeSchema(schema, ContrastFeasibilityFixture.options());
  const pair = report.pairs[0];

  assert.ok(pair !== undefined, 'declared pair receives a feasibility result');
  assert.strictEqual(pair.reachability, 'always-reachable');
  assert.deepStrictEqual(pair.reachableHueRanges, [{ 'end': 360, 'start': 0 }]);
  assert.strictEqual(pair.proof, undefined, 'reachable pair needs no limiting proof');
  assert.strictEqual(pair.sampled, undefined, 'fixed hues need no sampled evidence');
});

await test('ContrastFeasibility reports a production-gamut measured never-reachable proof', () => {
  const foreground = colorRecordFactory.fromOklch(0.55, 0.5, 120);
  const background = colorRecordFactory.fromOklch(0.2, 0.1, 0);
  const schema = ContrastFeasibilityFixture.schema(
    ContrastFeasibilityFixture.role('foreground', 0.55, 0.5, 120),
    ContrastFeasibilityFixture.role('background', 0.2, 0.1, 0),
    10
  );

  const report = ContrastFeasibility.analyzeSchema(schema, ContrastFeasibilityFixture.options());
  const pair = report.pairs[0];

  assert.ok(foreground.displayP3 !== undefined, 'fixture traverses the production sRGB gamut mapper');
  assert.ok(pair !== undefined, 'declared pair receives a feasibility result');
  assert.strictEqual(pair.reachability, 'never-reachable');
  assert.ok(pair.proof !== undefined, 'unreachable fixed pair includes measured evidence');
  assert.strictEqual(
    pair.proof.bestActual,
    contrastWcag21.apply(foreground, background),
    'proof measures the gamut-mapped factory records through the final WCAG primitive'
  );
  assert.ok(pair.proof.shortfall > 0, 'proof retains the unsatisfied measured shortfall');
});

await test('ContrastPairFeasibilityEntity validates explicit sampled evidence', () => {
  assert.throws(
    () => {
      const result = ContrastPairFeasibilityEntity.intake({
        'background': 'background',
        'foreground': 'foreground',
        'reachability': 'indeterminate',
        'reachableHueRanges': [],
        'sampled': { 'bestActual': 4.5, 'testedHues': [] }
      });
      return result;
    },
    Error,
    'sampled evidence requires at least one measured hue'
  );
});

await test('ContrastFeasibility emits sampled evidence rather than a continuous claim for unanchored hue', () => {
  const schema = ContrastFeasibilityFixture.schema(
    ContrastFeasibilityFixture.role('foreground', 0.55, 0.4),
    ContrastFeasibilityFixture.role('background', 0.1, 0.1, 0),
    4
  );

  const report = ContrastFeasibility.analyzeSchema(schema, ContrastFeasibilityFixture.options());
  const pair = report.pairs[0];

  assert.ok(pair !== undefined, 'declared pair receives a feasibility result');
  assert.strictEqual(pair.reachability, 'indeterminate');
  assert.deepStrictEqual(pair.reachableHueRanges, [], 'unanchored hues do not claim a continuous interval');
  assert.ok(pair.sampled !== undefined, 'unanchored hues retain sampled numerical evidence');
  assert.strictEqual(pair.sampled.testedHues[0], 0, 'subdivision starts at the lower hue boundary');
  assert.strictEqual(pair.sampled.testedHues.at(-1), 360, 'subdivision includes the upper hue boundary');
  assert.ok(pair.sampled.bestActual >= 4, 'sampled evidence retains the best measured final contrast');
});

await test('ContrastFeasibility certifies independent hue roots with a bounded witness', () => {
  const schema = ContrastFeasibilityFixture.schema(
    ContrastFeasibilityFixture.role('foreground', 0.95, 0.01),
    ContrastFeasibilityFixture.role('background', 0.05, 0.01),
    4.5
  );
  const report = ContrastFeasibility.analyzeSchema(schema, ContrastFeasibilityFixture.options());
  const pair = report.pairs[0];

  assert.ok(pair !== undefined, 'independent-root pair receives a feasibility result');
  assert.strictEqual(pair.reachability, 'always-reachable', 'one fixed envelope witness clears every bounded root-hue cell');
  assert.strictEqual(pair.sampled, undefined, 'a bounded witness does not rely on sampled evidence');
});

await test('ContrastFeasibility certifies a hue-independent neutral envelope without sampling', () => {
  const schema = ContrastFeasibilityFixture.schema(
    RoleDefinitionEntity.intake({
      'chromaRange': [0, 0.2],
      'lightnessRange': [0.85, 0.9],
      'name': 'foreground'
    }),
    RoleDefinitionEntity.intake({
      'chromaRange': [0, 0.2],
      'lightnessRange': [0.05, 0.1],
      'name': 'background'
    }),
    4.5
  );

  const report = ContrastFeasibility.analyzeSchema(schema, ContrastFeasibilityFixture.options());
  const pair = report.pairs[0];

  assert.ok(pair !== undefined, 'declared pair receives a feasibility result');
  assert.strictEqual(pair.reachability, 'always-reachable');
  assert.deepStrictEqual(pair.reachableHueRanges, [{ 'end': 360, 'start': 0 }]);
  assert.strictEqual(pair.sampled, undefined, 'a hue-independent certificate needs no sampled evidence');
});

await test('ContrastFeasibility treats stated run roles as exact pin bounds', () => {
  const schema = ContrastFeasibilityFixture.schema(
    ContrastFeasibilityFixture.role('foreground', 0.9, 0.1, 120),
    ContrastFeasibilityFixture.role('background', 0.1, 0.1, 120),
    4.5
  );
  const metadata = {};
  Metadata.writeRoleProvenance(metadata, new Map([
    ['background', RoleProvenanceEntity.create({ 'adjustments': [], 'origin': 'stated' })],
    ['foreground', RoleProvenanceEntity.create({ 'adjustments': [], 'origin': 'stated' })]
  ]));
  const state = {
    'colors': [],
    'input': InputEntity.intake({
      'colors': [],
      'contrast': ContrastFeasibilityFixture.options(),
      'roles': schema
    }),
    'metadata': metadata,
    'outputs': {},
    'roles': {
      'background': colorRecordFactory.fromOklch(0.51, 0.1, 120),
      'foreground': colorRecordFactory.fromOklch(0.5, 0.1, 120)
    },
    'runtime': RuntimeOptionsEntity.intake({}),
    'variants': {}
  };

  const report = ContrastFeasibility.proveRun(state);
  const pair = report.pairs[0];

  assert.ok(pair !== undefined, 'pinned pair receives a feasibility result');
  assert.strictEqual(pair.reachability, 'never-reachable');
  assert.deepStrictEqual(
    pair.proof?.limitingBounds.map((bound): string => {return bound.channel;}),
    ['pin', 'pin'],
    'proof identifies the stated records as exact limiting bounds'
  );
});

await test('ContrastFeasibility proves a resolved run with the same canonical records', () => {
  const schema = ContrastFeasibilityFixture.schema(
    ContrastFeasibilityFixture.role('foreground', 0.9, 0.1, 120),
    ContrastFeasibilityFixture.role('background', 0.1, 0.1, 120),
    4.5
  );
  const input = InputEntity.intake({
    'colors': [],
    'contrast': ContrastFeasibilityFixture.options(),
    'roles': schema
  });
  const state = {
    'colors': [],
    'input': input,
    'metadata': {},
    'outputs': {},
    'roles': {
      'background': colorRecordFactory.fromOklch(0.1, 0.1, 120),
      'foreground': colorRecordFactory.fromOklch(0.9, 0.1, 120)
    },
    'runtime': RuntimeOptionsEntity.intake({}),
    'variants': {}
  };

  const report = ContrastFeasibility.proveRun(state);
  const pair = report.pairs[0];

  assert.ok(pair !== undefined, 'run pair receives a feasibility result');
  assert.strictEqual(pair.reachability, 'always-reachable');
});

await test('ContrastFeasibility uses resolved run hues without unanchored sampling', () => {
  const schema = ContrastFeasibilityFixture.schema(
    ContrastFeasibilityFixture.role('foreground', 0.45, 0.1),
    ContrastFeasibilityFixture.role('background', 0.5, 0.1),
    4.5
  );
  const state = {
    'colors': [],
    'input': InputEntity.intake({
      'colors': [],
      'contrast': ContrastFeasibilityFixture.options(),
      'roles': schema
    }),
    'metadata': {},
    'outputs': {},
    'roles': {
      'background': colorRecordFactory.fromOklch(0.5, 0.1, 240),
      'foreground': colorRecordFactory.fromOklch(0.45, 0.1, 120)
    },
    'runtime': RuntimeOptionsEntity.intake({}),
    'variants': {}
  };

  const report = ContrastFeasibility.proveRun(state);
  const pair = report.pairs[0];

  assert.ok(pair !== undefined, 'resolved pair receives a feasibility result');
  assert.strictEqual(pair.reachability, 'never-reachable', 'resolved schema hues make the run certifiable');
  assert.ok(pair.proof !== undefined, 'resolved-hue failure retains its exact proof');
  assert.strictEqual(pair.sampled, undefined, 'terminal run never samples unanchored hue domains');
});


await test('ContrastFeasibility proves a fixed relationship against its resolved baseline', () => {
  const baseline = colorRecordFactory.fromHex('#777777');
  const schema = RoleSchemaEntity.intake({
    'contrastPairs': [{ 'background': 'background', 'foreground': 'text', 'minimumContrastRatio': 7 }],
    'name': 'fixed-relationship-feasibility',
    'relationshipGraph': {
      'groups': [{
        'anchor': 'source',
        'defaultMode': 'base',
        'id': 'text-group',
        'modes': [{ 'hueOffsets': [{ 'degrees': 0, 'variantId': 'base' }], 'id': 'base' }],
        'name': 'Text',
        'relationships': [{
          'id': 'text-alias',
          'operation': 'alias',
          'priority': 0,
          'relaxability': 'fixed',
          'source': 'source',
          'target': 'text'
        }]
      }]
    },
    'roles': [
      ContrastFeasibilityFixture.role('background', 1, 0, 0),
      ContrastFeasibilityFixture.role('source', 0.5, 0, 0),
      ContrastFeasibilityFixture.role('text', 0.9, 0, 0)
    ]
  });
  const metadata = {};
  Metadata.writeRelationshipResolution(metadata, new Map([['text', RelationshipResolutionEntity.create({
    'after': baseline,
    'disposition': 'applied',
    'groupId': 'text-group',
    'operation': 'alias',
    'relationshipId': 'text-alias',
    'sources': ['source']
  })]]));
  const state = {
    'colors': [],
    'input': InputEntity.intake({ 'colors': [], 'contrast': ContrastFeasibilityFixture.options(), 'roles': schema }),
    'metadata': metadata,
    'outputs': {},
    'roles': { 'background': colorRecordFactory.fromHex('#ffffff'), 'source': baseline, 'text': baseline },
    'runtime': RuntimeOptionsEntity.intake({}),
    'variants': {}
  };

  const pair = ContrastFeasibility.proveRun(state).pairs[0];

  assert.ok(pair !== undefined, 'relationship pair receives a proof');
  assert.strictEqual(pair.reachability, 'never-reachable');
  const channels = pair.proof?.limitingBounds.map((bound): string => { return bound.channel; }) ?? [];
  assert.ok(channels.includes('hue-relationship'), 'fixed relationship baselines are attributed to their relation');
  assert.equal(channels.includes('pin'), false, 'fixed relationship baselines are not attributed to stated pins');
});

await test('ContrastFeasibility bounds tolerant relationships by their baseline-centred tolerance', () => {
  const baseline = colorRecordFactory.fromHex('#777777');
  const schema = RoleSchemaEntity.intake({
    'contrastPairs': [{ 'background': 'background', 'foreground': 'text', 'minimumContrastRatio': 7 }],
    'name': 'tolerant-relationship-feasibility',
    'relationshipGraph': {
      'groups': [{
        'anchor': 'source',
        'defaultMode': 'base',
        'id': 'text-group',
        'modes': [{ 'hueOffsets': [{ 'degrees': 0, 'variantId': 'base' }], 'id': 'base' }],
        'name': 'Text',
        'relationships': [{
          'id': 'text-alias',
          'operation': 'alias',
          'priority': 0,
          'relaxability': 'tolerant',
          'source': 'source',
          'target': 'text',
          'tolerance': { 'chroma': 0, 'lightness': 0.01 }
        }]
      }]
    },
    'roles': [
      ContrastFeasibilityFixture.role('background', 1, 0, 0),
      ContrastFeasibilityFixture.role('source', 0.5, 0, 0),
      RoleDefinitionEntity.intake({
        'chromaRange': [0, 0.5],
        'lightnessRange': [0, 1],
        'name': 'text'
      })
    ]
  });
  const metadata = {};
  Metadata.writeRelationshipResolution(metadata, new Map([['text', RelationshipResolutionEntity.create({
    'after': baseline,
    'disposition': 'applied',
    'groupId': 'text-group',
    'operation': 'alias',
    'relationshipId': 'text-alias',
    'sources': ['source']
  })]]));
  const state = {
    'colors': [],
    'input': InputEntity.intake({ 'colors': [], 'contrast': ContrastFeasibilityFixture.options(), 'roles': schema }),
    'metadata': metadata,
    'outputs': {},
    'roles': { 'background': colorRecordFactory.fromHex('#ffffff'), 'source': baseline, 'text': baseline },
    'runtime': RuntimeOptionsEntity.intake({}),
    'variants': {}
  };

  const pair = ContrastFeasibility.proveRun(state).pairs[0];

  assert.ok(pair !== undefined, 'tolerant relationship pair receives a proof');
  assert.strictEqual(pair.reachability, 'never-reachable');
  assert.ok(pair.proof !== undefined, 'the constrained tolerance produces limiting evidence');
  assert.ok(pair.proof.bestActual < pair.proof.required, 'the proof excludes the role range outside its relationship tolerance');
});

await test('ContrastFeasibility leaves alpha-overlay schema targets indeterminate with sampled evidence', () => {
  const schema = RoleSchemaEntity.intake({
    'contrastPairs': [{ 'background': 'background', 'foreground': 'overlay-target', 'minimumContrastRatio': 4.5 }],
    'name': 'alpha-overlay-feasibility',
    'relationshipGraph': {
      'groups': [{
        'anchor': 'base',
        'defaultMode': 'base',
        'id': 'overlay-group',
        'modes': [{ 'hueOffsets': [{ 'degrees': 0, 'variantId': 'base' }], 'id': 'base' }],
        'name': 'Overlay',
        'relationships': [{
          'alpha': 0.5,
          'base': 'base',
          'id': 'overlay-target',
          'operation': 'alpha-overlay',
          'overlay': 'overlay',
          'priority': 0,
          'relaxability': 'fixed',
          'target': 'overlay-target'
        }]
      }]
    },
    'roles': [
      ContrastFeasibilityFixture.role('background', 0.1, 0, 0),
      ContrastFeasibilityFixture.role('base', 0.2, 0, 0),
      ContrastFeasibilityFixture.role('overlay', 0.9, 0, 0),
      ContrastFeasibilityFixture.role('overlay-target', 0.9, 0, 0)
    ]
  });

  const pair = ContrastFeasibility.analyzeSchema(schema, ContrastFeasibilityFixture.options()).pairs[0];

  assert.ok(pair !== undefined, 'overlay pair receives a feasibility result');
  assert.strictEqual(pair.reachability, 'indeterminate');
  assert.ok(pair.sampled !== undefined, 'source-over targets retain labelled sampled evidence until compositing intervals are bounded');
});

await test('ContrastFeasibility projects hue-target relationships through the authored clamp', () => {
  const roles = [
    ContrastFeasibilityFixture.role('background', 0.05, 0.01, 0),
    ContrastFeasibilityFixture.role('source', 0.85, 0.01, 120),
    RoleDefinitionEntity.intake({
      'chromaRange': [0.01, 0.01],
      'lightnessRange': [0.85, 0.85],
      'name': 'fixed-target'
    }),
    RoleDefinitionEntity.intake({
      'chromaRange': [0.01, 0.01],
      'lightnessRange': [0.85, 0.85],
      'name': 'bounded-target'
    })
  ];
  const schema = RoleSchemaEntity.intake({
    'contrastPairs': [
      { 'background': 'background', 'foreground': 'fixed-target', 'minimumContrastRatio': 4.5 },
      { 'background': 'background', 'foreground': 'bounded-target', 'minimumContrastRatio': 4.5 }
    ],
    'name': 'hue-target-feasibility',
    'relationshipGraph': {
      'groups': [{
        'anchor': 'source',
        'defaultMode': 'semantic',
        'id': 'semantic',
        'modes': [{ 'hueOffsets': [{ 'degrees': 0, 'variantId': 'semantic' }], 'id': 'semantic' }],
        'name': 'Semantic',
        'relationships': [
          {
            'clamp': 180,
            'hue': 0,
            'id': 'background-hue',
            'operation': 'hue-target',
            'priority': 0,
            'relaxability': 'fixed',
            'target': 'background'
          },
          {
            'clamp': 180,
            'hue': 120,
            'id': 'source-hue',
            'operation': 'hue-target',
            'priority': 1,
            'relaxability': 'fixed',
            'target': 'source'
          },
          {
            'clamp': 180,
            'hue': 25,
            'id': 'fixed-target',
            'operation': 'hue-target',
            'priority': 2,
            'relaxability': 'fixed',
            'source': 'source',
            'target': 'fixed-target'
          },
          {
            'hue': 25,
            'id': 'bounded-target',
            'operation': 'hue-target',
            'priority': 3,
            'relaxability': 'fixed',
            'source': 'source',
            'target': 'bounded-target'
          }
        ]
      }]
    },
    'roles': roles
  });

  const pairs = ContrastFeasibility.analyzeSchema(schema, ContrastFeasibilityFixture.options()).pairs;
  const fixed = pairs.find((pair) => {
    const result = pair.foreground === 'fixed-target';
    return result;
  });
  const bounded = pairs.find((pair) => {
    const result = pair.foreground === 'bounded-target';
    return result;
  });

  assert.ok(fixed !== undefined, 'fixed hue-target pair receives a feasibility result');
  assert.strictEqual(fixed.reachability, 'always-reachable', 'a full clamp fixes the target hue for every source hue');
  assert.strictEqual(fixed.sampled, undefined, 'fixed hue-targets use a continuous certificate');
  assert.ok(bounded !== undefined, 'bounded hue-target pair receives a feasibility result');
  assert.strictEqual(bounded.reachability, 'always-reachable', 'the bounded hue arc is certified when its full envelope clears');
  assert.strictEqual(bounded.sampled, undefined, 'bounded hue-target certificates do not rely on sampled evidence');
});

await test('ContrastFeasibility certifies a source-derived hue-target arc across the zero-degree wrap', () => {
  const schema = RoleSchemaEntity.intake({
    'contrastPairs': [{ 'background': 'background', 'foreground': 'semantic', 'minimumContrastRatio': 4.5 }],
    'name': 'wrapped-hue-target-feasibility',
    'relationshipGraph': {
      'groups': [{
        'anchor': 'source',
        'defaultMode': 'semantic',
        'id': 'semantic',
        'modes': [{ 'hueOffsets': [{ 'degrees': 0, 'variantId': 'semantic' }], 'id': 'semantic' }],
        'name': 'Semantic',
        'relationships': [
          {
            'clamp': 180,
            'hue': 0,
            'id': 'background-hue',
            'operation': 'hue-target',
            'priority': 0,
            'relaxability': 'fixed',
            'target': 'background'
          },
          {
            'hue': 25,
            'id': 'semantic',
            'operation': 'hue-target',
            'priority': 1,
            'relaxability': 'fixed',
            'source': 'source',
            'target': 'semantic'
          }
        ]
      }]
    },
    'roles': [
      ContrastFeasibilityFixture.role('background', 0.05, 0.01, 0),
      ContrastFeasibilityFixture.role('source', 0.85, 0.01),
      ContrastFeasibilityFixture.role('semantic', 0.85, 0.01)
    ]
  });

  const pair = ContrastFeasibility.analyzeSchema(schema, ContrastFeasibilityFixture.options()).pairs[0];

  assert.ok(pair !== undefined, 'source-derived hue-target pair receives a feasibility result');
  assert.strictEqual(pair.reachability, 'always-reachable');
  assert.strictEqual(pair.sampled, undefined, 'the bounded target arc is certified through both wrapped segments');
});


await test('ContrastFeasibility bounds an unanchored hue-target by the authored clamp image', () => {
  const schema = RoleSchemaEntity.intake({
    'contrastPairs': [{ 'background': 'background', 'foreground': 'target', 'minimumContrastRatio': 4.5 }],
    'name': 'bounded-unanchored-hue-target',
    'relationshipGraph': {
      'groups': [{
        'anchor': 'source',
        'defaultMode': 'base',
        'id': 'target-group',
        'modes': [{ 'hueOffsets': [{ 'degrees': 0, 'variantId': 'base' }], 'id': 'base' }],
        'name': 'Target',
        'relationships': [
          { 'clamp': 180, 'hue': 0, 'id': 'background-hue', 'operation': 'hue-target', 'priority': 0, 'relaxability': 'fixed', 'target': 'background' },
          { 'clamp': 30, 'hue': 25, 'id': 'target-hue', 'operation': 'hue-target', 'priority': 1, 'relaxability': 'fixed', 'source': 'source', 'target': 'target' }
        ]
      }]
    },
    'roles': [
      ContrastFeasibilityFixture.role('background', 0.05, 0.01, 0),
      ContrastFeasibilityFixture.role('source', 0.85, 0.2),
      ContrastFeasibilityFixture.role('target', 0.85, 0.2)
    ]
  });

  const pair = ContrastFeasibility.analyzeSchema(schema, ContrastFeasibilityFixture.options()).pairs[0];

  assert.ok(pair !== undefined, 'unanchored target pair receives a feasibility result');
  assert.strictEqual(pair.reachability, 'indeterminate', 'a thirty-degree movement clamp permits the full one-hundred-fifty-degree output arc');
  assert.ok(pair.sampled !== undefined, 'the unresolved wide hue arc retains sampled evidence');
});


await test('ContrastFeasibility matches midpoint and clamped graph coordinate envelopes', () => {
  const schemaFor = (
    relationship: RoleRelationshipEntity.Type,
    target: RoleDefinitionEntity.Type,
    sourceLightness: readonly [number, number]
  ): RoleSchemaEntity.Type => {
    const result = RoleSchemaEntity.intake({
      'contrastPairs': [{ 'background': 'background', 'foreground': 'target', 'minimumContrastRatio': 7 }],
      'name': 'graph-coordinate-envelope-parity',
      'relationshipGraph': {
        'groups': [{
          'anchor': 'source',
          'defaultMode': 'base',
          'id': 'relationships',
          'modes': [{ 'hueOffsets': [{ 'degrees': 0, 'variantId': 'base' }], 'id': 'base' }],
          'name': 'Relationships',
          'relationships': [
            { 'clamp': 180, 'hue': 0, 'id': 'background-hue', 'operation': 'hue-target', 'priority': 0, 'relaxability': 'fixed', 'target': 'background' },
            { 'clamp': 180, 'hue': 0, 'id': 'source-hue', 'operation': 'hue-target', 'priority': 1, 'relaxability': 'fixed', 'target': 'source' },
            relationship
          ]
        }]
      },
      'roles': [
        ContrastFeasibilityFixture.role('background', 0.05, 0, 0),
        RoleDefinitionEntity.intake({ 'chromaRange': [0.1, 0.3], 'lightnessRange': sourceLightness, 'name': 'source' }),
        target
      ]
    });
    return result;
  };
  const fixedTarget = (lightness: number): RoleDefinitionEntity.Type => {
    const result = RoleDefinitionEntity.intake({
      'chromaRange': [0.03, 0.03],
      'lightnessRange': [lightness, lightness],
      'name': 'target'
    });
    return result;
  };
  const midpointGraph = schemaFor(
    { 'id': 'target-alias', 'operation': 'alias', 'priority': 2, 'relaxability': 'fixed', 'source': 'source', 'target': 'target' },
    RoleDefinitionEntity.intake({ 'chromaRange': [0.01, 0.05], 'lightnessRange': [0.7, 0.9], 'name': 'target' }),
    [0.3, 0.7]
  );
  const midpointLegacyEquivalent = schemaFor(
    { 'clamp': 180, 'hue': 0, 'id': 'target-hue', 'operation': 'hue-target', 'priority': 2, 'relaxability': 'fixed', 'target': 'target' },
    fixedTarget(0.8),
    [0.3, 0.7]
  );
  const clampedGraph = schemaFor(
    { 'id': 'target-delta', 'lightnessOffset': 0.1, 'operation': 'oklch-delta', 'priority': 2, 'relaxability': 'fixed', 'source': 'source', 'target': 'target' },
    RoleDefinitionEntity.intake({ 'chromaRange': [0.01, 0.05], 'lightnessRange': [0.7, 0.9], 'name': 'target' }),
    [0.1, 0.2]
  );
  const clampedLegacyEquivalent = schemaFor(
    { 'clamp': 180, 'hue': 0, 'id': 'target-hue', 'operation': 'hue-target', 'priority': 2, 'relaxability': 'fixed', 'target': 'target' },
    fixedTarget(0.7),
    [0.1, 0.2]
  );
  const midpointGraphPair = ContrastFeasibility.analyzeSchema(midpointGraph, ContrastFeasibilityFixture.options()).pairs[0];
  const midpointLegacyPair = ContrastFeasibility.analyzeSchema(midpointLegacyEquivalent, ContrastFeasibilityFixture.options()).pairs[0];
  const clampedGraphPair = ContrastFeasibility.analyzeSchema(clampedGraph, ContrastFeasibilityFixture.options()).pairs[0];
  const clampedLegacyPair = ContrastFeasibility.analyzeSchema(clampedLegacyEquivalent, ContrastFeasibilityFixture.options()).pairs[0];

  assert.ok(midpointGraphPair !== undefined, 'preserved graph target receives a feasibility result');
  assert.ok(midpointLegacyPair !== undefined, 'legacy midpoint equivalent receives a feasibility result');
  assert.strictEqual(
    midpointGraphPair.reachability,
    midpointLegacyPair.reachability,
    'preserved graph coordinates use the declared target range midpoint'
  );
  assert.deepStrictEqual(
    clampedGraphPair,
    clampedLegacyPair,
    'explicit graph coordinates clamp into the declared target envelope'
  );
});


await test('ContrastFeasibility preserves source-less hue-target coordinate domains', () => {
  const schema = RoleSchemaEntity.intake({
    'contrastPairs': [{ 'background': 'background', 'foreground': 'target', 'minimumContrastRatio': 7 }],
    'name': 'source-less-hue-target-domain',
    'relationshipGraph': {
      'groups': [{
        'anchor': 'target',
        'defaultMode': 'fixed',
        'id': 'fixed-hues',
        'modes': [{ 'hueOffsets': [{ 'degrees': 0, 'variantId': 'fixed' }], 'id': 'fixed' }],
        'name': 'Fixed hues',
        'relationships': [
          { 'clamp': 180, 'hue': 0, 'id': 'background-hue', 'operation': 'hue-target', 'priority': 0, 'relaxability': 'fixed', 'target': 'background' },
          { 'clamp': 180, 'hue': 0, 'id': 'target-hue', 'operation': 'hue-target', 'priority': 1, 'relaxability': 'fixed', 'target': 'target' }
        ]
      }]
    },
    'roles': [
      ContrastFeasibilityFixture.role('background', 0.05, 0, 0),
      RoleDefinitionEntity.intake({ 'chromaRange': [0, 0], 'lightnessRange': [0.1, 0.9], 'name': 'target' })
    ]
  });

  const pair = ContrastFeasibility.analyzeSchema(schema, ContrastFeasibilityFixture.options()).pairs[0];

  assert.ok(pair !== undefined, 'source-less hue-target receives a feasibility result');
  assert.strictEqual(pair.reachability, 'always-reachable', 'target keeps its independently resolved coordinate domain');
});

await test('ContrastFeasibility certifies graph alias, hue-offset, and OKLCH delta targets', () => {
  const schema = RoleSchemaEntity.intake({
    'contrastPairs': [
      { 'background': 'background', 'foreground': 'alias-target', 'minimumContrastRatio': 4.5 },
      { 'background': 'background', 'foreground': 'offset-target', 'minimumContrastRatio': 4.5 },
      { 'background': 'background', 'foreground': 'delta-target', 'minimumContrastRatio': 4.5 }
    ],
    'name': 'graph-derived-feasibility',
    'relationshipGraph': {
      'groups': [{
        'anchor': 'source',
        'defaultMode': 'opposite',
        'id': 'derived',
        'modes': [{ 'hueOffsets': [{ 'degrees': 180, 'variantId': 'opposite' }], 'id': 'opposite' }],
        'name': 'Derived',
        'relationships': [
          {
            'clamp': 180,
            'hue': 0,
            'id': 'background-hue',
            'operation': 'hue-target',
            'priority': 0,
            'relaxability': 'fixed',
            'target': 'background'
          },
          {
            'id': 'alias',
            'operation': 'alias',
            'priority': 1,
            'relaxability': 'fixed',
            'source': 'source',
            'target': 'alias-target'
          },
          {
            'id': 'offset',
            'operation': 'hue-offset',
            'priority': 2,
            'relaxability': 'fixed',
            'source': 'source',
            'target': 'offset-target',
            'variantId': 'opposite'
          },
          {
            'id': 'delta',
            'lightnessOffset': 0.1,
            'operation': 'oklch-delta',
            'priority': 3,
            'relaxability': 'fixed',
            'source': 'source',
            'target': 'delta-target'
          }
        ]
      }]
    },
    'roles': [
      ContrastFeasibilityFixture.role('background', 0.05, 0.01),
      ContrastFeasibilityFixture.role('source', 0.85, 0.01),
      ContrastFeasibilityFixture.role('alias-target', 0.85, 0.01),
      ContrastFeasibilityFixture.role('offset-target', 0.85, 0.01),
      ContrastFeasibilityFixture.role('delta-target', 0.95, 0.01)
    ]
  });

  const pairs = ContrastFeasibility.analyzeSchema(schema, ContrastFeasibilityFixture.options()).pairs;

  assert.deepStrictEqual(
    pairs.map((pair) => { return [pair.foreground, pair.reachability]; }),
    [
      ['alias-target', 'always-reachable'],
      ['offset-target', 'always-reachable'],
      ['delta-target', 'always-reachable']
    ],
    'graph operations retain continuous feasibility certificates'
  );
});
