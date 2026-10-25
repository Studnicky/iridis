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
      ...(hue === undefined ? {} : { 'hue': hue }),
      'lightnessRange': [lightness, lightness],
      'name': name
    });
    return result;
  }

  static schema(
    foreground: RoleDefinitionEntity.Type,
    background: RoleDefinitionEntity.Type,
    minimumContrastRatio: number
  ): RoleSchemaEntity.Type {
    const result = RoleSchemaEntity.intake({
      'contrastPairs': [{
        'background': background.name,
        'foreground': foreground.name,
        'minimumContrastRatio': minimumContrastRatio
      }],
      'name': 'contrast-feasibility',
      'roles': [foreground, background]
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

await test('ContrastFeasibility certifies derived hue offsets from their shared root', () => {
  const schema = RoleSchemaEntity.intake({
    'contrastPairs': [{
      'background': 'brand',
      'foreground': 'opposite',
      'minimumContrastRatio': 1
    }],
    'name': 'derived-hue-sampling',
    'roles': [
      RoleDefinitionEntity.intake({
        'chromaRange': [0.2, 0.2],
        'lightnessRange': [0.15, 0.15],
        'name': 'brand'
      }),
      RoleDefinitionEntity.intake({
        'chromaRange': [0.2, 0.2],
        'derivedFrom': 'brand',
        'hueOffset': 180,
        'lightnessRange': [0.85, 0.85],
        'name': 'opposite'
      })
    ]
  });
  const report = ContrastFeasibility.analyzeSchema(schema, ContrastFeasibilityFixture.options());
  const pair = report.pairs[0];
  const measured: number[] = [];
  for (let hue = 0; hue <= 360; hue += 30) {
    const foreground = colorRecordFactory.fromOklch(0.85, 0.2, (hue + 180) % 360);
    const background = colorRecordFactory.fromOklch(0.15, 0.2, hue);
    measured.push(contrastWcag21.apply(foreground, background));
  }

  assert.ok(pair !== undefined, 'derived pair receives a feasibility result');
  assert.strictEqual(pair.reachability, 'always-reachable', 'bounded affine arcs certify every root hue');
  assert.strictEqual(pair.sampled, undefined, 'the affine certificate does not depend on sampled evidence');
  assert.ok(
    Math.min(...measured) >= 1,
    'the certificate holds at each coarse independent hue probe through the emitted color records'
  );
});

await test('ContrastFeasibility certifies an affine derived hue arc when its gamut bounds clear the requirement', () => {
  const schema = RoleSchemaEntity.intake({
    'contrastPairs': [{
      'background': 'brand',
      'foreground': 'opposite',
      'minimumContrastRatio': 4.5
    }],
    'name': 'derived-hue-arc-certificate',
    'roles': [
      RoleDefinitionEntity.intake({
        'chromaRange': [0.01, 0.01],
        'lightnessRange': [0.05, 0.05],
        'name': 'brand'
      }),
      RoleDefinitionEntity.intake({
        'chromaRange': [0.01, 0.01],
        'derivedFrom': 'brand',
        'hueOffset': 180,
        'lightnessRange': [0.95, 0.95],
        'name': 'opposite'
      })
    ]
  });

  const report = ContrastFeasibility.analyzeSchema(schema, ContrastFeasibilityFixture.options());
  const pair = report.pairs[0];

  assert.ok(pair !== undefined, 'declared pair receives an affine-arc result');
  assert.strictEqual(pair.reachability, 'always-reachable');
  assert.strictEqual(pair.sampled, undefined, 'the certificate does not depend on sampled evidence');
});

await test('ContrastFeasibility retains sampled evidence for hue-target clamp relationships', () => {
  const schema = RoleSchemaEntity.intake({
    'contrastPairs': [{
      'background': 'brand',
      'foreground': 'semantic',
      'minimumContrastRatio': 4.5
    }],
    'name': 'hue-target-clamp-indeterminate',
    'roles': [
      RoleDefinitionEntity.intake({
        'chromaRange': [0.1, 0.1],
        'lightnessRange': [0.1, 0.1],
        'name': 'brand'
      }),
      RoleDefinitionEntity.intake({
        'chromaRange': [0.1, 0.1],
        'derivedFrom': 'brand',
        'hue': 25,
        'hueClamp': 45,
        'lightnessRange': [0.9, 0.9],
        'name': 'semantic'
      })
    ]
  });

  const report = ContrastFeasibility.analyzeSchema(schema, ContrastFeasibilityFixture.options());
  const pair = report.pairs[0];

  assert.ok(pair !== undefined, 'hue-target pair receives a feasibility result');
  assert.strictEqual(pair.reachability, 'indeterminate', 'non-affine hue clamp relations do not receive a continuous certificate');
  assert.ok(pair.sampled !== undefined, 'indeterminate hue clamp relations retain sampled evidence');
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
            'hue': 25,
            'id': 'fixed-target',
            'operation': 'hue-target',
            'priority': 0,
            'relaxability': 'fixed',
            'source': 'source',
            'target': 'fixed-target'
          },
          {
            'hue': 25,
            'id': 'bounded-target',
            'operation': 'hue-target',
            'priority': 1,
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
        'relationships': [{
          'hue': 25,
          'id': 'semantic',
          'operation': 'hue-target',
          'priority': 0,
          'relaxability': 'fixed',
          'source': 'source',
          'target': 'semantic'
        }]
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

await test('ContrastFeasibility classifies graph alias, hue-offset, and OKLCH delta targets like legacy hue derivation', () => {
  const roles = [
    ContrastFeasibilityFixture.role('background', 0.05, 0.01),
    ContrastFeasibilityFixture.role('source', 0.85, 0.01),
    RoleDefinitionEntity.intake({
      'chromaRange': [0.01, 0.01],
      'derivedFrom': 'source',
      'lightnessRange': [0.85, 0.85],
      'name': 'alias-target'
    }),
    RoleDefinitionEntity.intake({
      'chromaRange': [0.01, 0.01],
      'derivedFrom': 'source',
      'hueOffset': 180,
      'lightnessRange': [0.85, 0.85],
      'name': 'offset-target'
    }),
    RoleDefinitionEntity.intake({
      'chromaRange': [0.01, 0.01],
      'derivedFrom': 'source',
      'lightnessRange': [0.95, 0.95],
      'name': 'delta-target'
    })
  ];
  const pairs = ['alias-target', 'offset-target', 'delta-target'].map((foreground) => {
    return {
      'background': 'background',
      'foreground': foreground,
      'minimumContrastRatio': 4.5
    };
  });
  const legacy = RoleSchemaEntity.intake({
    'contrastPairs': pairs,
    'name': 'legacy-derived-feasibility',
    'roles': roles
  });
  const graph = RoleSchemaEntity.intake({
    'contrastPairs': pairs,
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
            'id': 'alias',
            'operation': 'alias',
            'priority': 0,
            'relaxability': 'fixed',
            'source': 'source',
            'target': 'alias-target'
          },
          {
            'id': 'offset',
            'operation': 'hue-offset',
            'priority': 1,
            'relaxability': 'fixed',
            'source': 'source',
            'target': 'offset-target',
            'variantId': 'opposite'
          },
          {
            'id': 'delta',
            'lightnessOffset': 0.1,
            'operation': 'oklch-delta',
            'priority': 2,
            'relaxability': 'fixed',
            'source': 'source',
            'target': 'delta-target'
          }
        ]
      }]
    },
    'roles': roles
  });

  const legacyPairs = ContrastFeasibility.analyzeSchema(legacy, ContrastFeasibilityFixture.options()).pairs;
  const graphPairs = ContrastFeasibility.analyzeSchema(graph, ContrastFeasibilityFixture.options()).pairs;

  assert.deepStrictEqual(
    graphPairs.map((pair) => { return [pair.foreground, pair.reachability]; }),
    legacyPairs.map((pair) => { return [pair.foreground, pair.reachability]; }),
    'graph operations preserve the certified classification of equivalent legacy derivations'
  );
  const everyGraphPairIsReachable = graphPairs.every((pair) => {
    const result = pair.reachability === 'always-reachable';
    return result;
  });
  assert.ok(everyGraphPairIsReachable, 'bounded graph targets receive continuous certificates');
});
