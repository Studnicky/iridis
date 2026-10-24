import {
  colorRecordFactory,
  ContrastOptionsEntity,
  contrastWcag21,
  InputEntity,
  Metadata,
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
  const expected = Math.max(...[0, 120, 240, 360].map((hue): number => {
    const foreground = colorRecordFactory.fromOklch(0.85, 0.2, (hue + 180) % 360);
    const background = colorRecordFactory.fromOklch(0.15, 0.2, hue);
    const result = contrastWcag21.apply(foreground, background);
    return result;
  }));

  assert.ok(pair !== undefined, 'derived pair receives a feasibility result');
  assert.strictEqual(pair.reachability, 'always-reachable', 'bounded affine arcs certify every root hue');
  assert.strictEqual(pair.sampled, undefined, 'the affine certificate does not depend on sampled evidence');
  assert.ok(expected >= 1, 'the shared root relation preserves its declared offset at every probe hue');
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
