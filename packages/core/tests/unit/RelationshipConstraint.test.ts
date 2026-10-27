import type { JSONSchema7Type } from 'json-schema';

import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ColorRecordEntity } from '../../src/entities/ColorRecordEntity.ts';
import type { PaletteStateInterface } from '../../src/interfaces/PaletteStateInterface.ts';
import type { TaskInterface } from '../../src/interfaces/TaskInterface.ts';

import { Engine } from '../../src/engine/Engine.ts';
import { ContrastPairEntity } from '../../src/entities/ContrastPairEntity.ts';
import { InputEntity } from '../../src/entities/InputEntity.ts';
import { RelationshipResolutionEntity } from '../../src/entities/RelationshipResolutionEntity.ts';
import { RoleProvenanceEntity } from '../../src/entities/RoleProvenanceEntity.ts';
import { RoleSchemaEntity } from '../../src/entities/RoleSchemaEntity.ts';
import { TaskManifestEntity } from '../../src/entities/TaskManifestEntity.ts';
import { ColorCoordinate } from '../../src/math/ColorCoordinate.ts';
import { colorRecordFactory } from '../../src/math/ColorRecordFactory.ts';
import { hueResolutionChroma } from '../../src/math/index.ts';
import { RelationshipConstraint } from '../../src/model/RelationshipConstraint.ts';
import { RelationshipConstraintDomain } from '../../src/model/RelationshipConstraintDomain.ts';
import { coreTasks } from '../../src/tasks/index.ts';
import { Metadata } from '../../src/types/metadata.ts';

class RelationshipConstraintFixture {
  static input(options: Readonly<{
    'minimumContrastRatio'?: number;
    'tolerance'?: Readonly<Record<string, number>>;
  }> = {}): InputEntity.Type {
    const tolerance = options.tolerance;
    const minimumContrastRatio = options.minimumContrastRatio ?? 7;
    const relationship = {
      'id': 'text-from-source',
      'operation': 'alias',
      'priority': 0,
      'relaxability': tolerance === undefined ? 'fixed' : 'tolerant',
      'source': 'source',
      'target': 'text',
      ...(tolerance === undefined ? {} : { 'tolerance': tolerance })
    };
    const roles = RoleSchemaEntity.intake({
      'contrastPairs': [ContrastPairEntity.create({
        'background': 'background',
        'foreground': 'text',
        'minimumContrastRatio': minimumContrastRatio
      })],
      'name': 'relationship-constraint',
      'relationshipGraph': {
        'groups': [{
          'anchor': 'source',
          'defaultMode': 'default',
          'id': 'text-group',
          'modes': [{ 'hueOffsets': [{ 'degrees': 0, 'variantId': 'base' }], 'id': 'default' }],
          'name': 'Text',
          'relationships': [relationship]
        }]
      },
      'roles': [{ 'name': 'background' }, { 'name': 'source' }, { 'name': 'text' }]
    });
    const result = InputEntity.intake({ 'colors': [], 'roles': roles });
    return result;
  }

  static inputWithoutRelationship(
    options: Readonly<{
      'minimumContrastRatio'?: number;
      'tolerance'?: Readonly<Record<string, number>>;
    }> = {}
  ): InputEntity.Type {
    const withRelationship = RelationshipConstraintFixture.input(options);
    const roleSchema = withRelationship.roles;
    if (roleSchema === undefined) {
      throw new TypeError('Relationship fixture requires a role schema');
    }
    const roles = RoleSchemaEntity.create({
      ...(roleSchema.contrastPairs === undefined
        ? {}
        : { 'contrastPairs': roleSchema.contrastPairs }),
      'name': roleSchema.name,
      'roles': roleSchema.roles
    });
    const result = InputEntity.intake({ 'colors': [], 'roles': roles });
    return result;
  }

  static metadata(baseline: ColorRecordEntity.Type): Record<string, JSONSchema7Type> {
    const metadata: Record<string, JSONSchema7Type> = {};
    Metadata.writeRelationshipResolution(metadata, new Map([['text', RelationshipResolutionEntity.create({
      'after': baseline,
      'disposition': 'applied',
      'groupId': 'text-group',
      'operation': 'alias',
      'relationshipId': 'text-from-source',
      'sources': ['source']
    })]]));
    return metadata;
  }

  static candidate(
    baseline: ColorRecordEntity.Type,
    options: Readonly<{ 'alpha'?: number; 'chroma'?: number; 'hue'?: number; 'lightness'?: number }> = {}
  ): ColorRecordEntity.Type {
    const result = colorRecordFactory.fromOklch(
      options.lightness ?? baseline.oklch.l,
      options.chroma ?? baseline.oklch.c,
      options.hue ?? baseline.oklch.h,
      { 'alpha': options.alpha ?? baseline.alpha, 'origin': baseline }
    );
    return result;
  }

  static engine(input: InputEntity.Type, baseline: ColorRecordEntity.Type): Engine {
    const engine = new Engine();
    for (let index = 0; index < coreTasks.length; index += 1) {
      const task = coreTasks[index];
      if (task !== undefined) {
        engine.tasks.register(task);
      }
    }
    engine.tasks.hook(new RelationshipConstraintSeedTask(baseline));
    engine.pipeline(['enforce:contrast']);
    return engine;
  }
}

class RelationshipConstraintSeedTask implements TaskInterface {
  readonly 'name' = 'seed:relationship-constraint';
  readonly #baseline: ColorRecordEntity.Type;

  readonly 'manifest': TaskManifestEntity.Type = TaskManifestEntity.create({
    'name': 'seed:relationship-constraint',
    'phase': 'onRunStart',
    'writes': ['metadata', 'roles']
  });

  constructor(baseline: ColorRecordEntity.Type) {
    this.#baseline = baseline;
  }

  run(state: PaletteStateInterface): void {
    const background = colorRecordFactory.fromHex('#ffffff');
    state.roles.background = background;
    state.roles.source = this.#baseline;
    state.roles.text = this.#baseline;
    Metadata.writeRoleProvenance(state.metadata, new Map([
      ['background', RoleProvenanceEntity.create({ 'adjustments': [], 'origin': 'derived' })],
      ['source', RoleProvenanceEntity.create({ 'adjustments': [], 'origin': 'derived' })],
      ['text', RoleProvenanceEntity.create({ 'adjustments': [], 'origin': 'derived' })]
    ]));
    Metadata.writeRelationshipResolution(state.metadata, new Map([['text', RelationshipResolutionEntity.create({
      'after': this.#baseline,
      'disposition': 'applied',
      'groupId': 'text-group',
      'operation': 'alias',
      'relationshipId': 'text-from-source',
      'sources': ['source']
    })]]));
  }
}

void test('RelationshipConstraint fixes a resolved relationship at its exact baseline', () => {
  const baseline = colorRecordFactory.fromHex('#77777780');
  const input = RelationshipConstraintFixture.input();
  const metadata = RelationshipConstraintFixture.metadata(baseline);

  assert.equal(RelationshipConstraint.allows(input, metadata, 'text', baseline), true);
  assert.equal(
    RelationshipConstraint.allows(
      input,
      metadata,
      'text',
      RelationshipConstraintFixture.candidate(baseline, { 'lightness': baseline.oklch.l + 0.01 })
    ),
    false
  );
  assert.equal(RelationshipConstraint.allows(InputEntity.create({ 'colors': [] }), metadata, 'text', baseline), true);
});

void test('RelationshipConstraint applies only declared tolerant lightness chroma hue and alpha limits', () => {
  const baseline = colorRecordFactory.fromHex('#77777780');
  const input = RelationshipConstraintFixture.input({ 'tolerance': {
    'alpha': 0.1,
    'chroma': 0.02,
    'hue': 8,
    'lightness': 0.03
  } });
  const metadata = RelationshipConstraintFixture.metadata(baseline);
  const inside = RelationshipConstraintFixture.candidate(baseline, {
    'alpha': baseline.alpha + 0.05,
    'chroma': baseline.oklch.c + 0.01,
    'hue': baseline.oklch.h + 4,
    'lightness': baseline.oklch.l + 0.02
  });
  const outside = RelationshipConstraintFixture.candidate(baseline, {
    'alpha': baseline.alpha + 0.15,
    'chroma': baseline.oklch.c + 0.03,
    'hue': baseline.oklch.h + 10,
    'lightness': baseline.oklch.l + 0.04
  });

  assert.equal(RelationshipConstraint.allows(input, metadata, 'text', inside), true);
  assert.equal(RelationshipConstraint.allows(input, metadata, 'text', outside), false);

  const lightnessOnly = RelationshipConstraintFixture.input({ 'tolerance': { 'lightness': 0.03 } });
  assert.equal(
    RelationshipConstraint.allows(
      lightnessOnly,
      metadata,
      'text',
      RelationshipConstraintFixture.candidate(baseline, { 'chroma': baseline.oklch.c + 0.01 })
    ),
    false
  );
});

void test('RelationshipConstraint compares coordinate candidates like canonical records', () => {
  const baseline = colorRecordFactory.fromHex('#77777780');
  const input = RelationshipConstraintFixture.input({ 'tolerance': {
    'alpha': 0.1,
    'chroma': 0.02,
    'hue': 8,
    'lightness': 0.03
  } });
  const metadata = RelationshipConstraintFixture.metadata(baseline);
  const candidate = RelationshipConstraintFixture.candidate(baseline, {
    'alpha': baseline.alpha + 0.05,
    'chroma': baseline.oklch.c + 0.01,
    'hue': baseline.oklch.h + 4,
    'lightness': baseline.oklch.l + 0.02
  });
  const coordinate = ColorCoordinate.fromOklch(
    candidate.oklch.l,
    candidate.oklch.c,
    candidate.oklch.h
  );
  const domain = RelationshipConstraint.domain(input, metadata, 'text');
  const expected = RelationshipConstraint.allows(input, metadata, 'text', candidate);

  assert.equal(
    RelationshipConstraint.allowsCoordinates(input, metadata, 'text', candidate.alpha, coordinate),
    expected
  );
  assert.equal(RelationshipConstraint.allowsDomain(domain, candidate.alpha, coordinate), expected);
});

void test('RelationshipConstraint exposes the resolved relationship domain without duplicating graph lookup', () => {
  const baseline = colorRecordFactory.fromHex('#77777780');
  const input = RelationshipConstraintFixture.input({ 'tolerance': {
    'alpha': 0.1,
    'chroma': 0.02,
    'hue': 8,
    'lightness': 0.03
  } });
  const domain = RelationshipConstraint.domain(input, RelationshipConstraintFixture.metadata(baseline), 'text');

  assert.ok(domain?.baseline !== undefined);
  assert.equal(domain.baseline.hex, baseline.hex);
  assert.equal(domain.relationId, 'text-from-source');
  assert.equal(domain.tolerance?.lightness, 0.03);

  const authored = RelationshipConstraint.domain(input, {}, 'text');
  assert.ok(authored !== undefined);
  assert.equal(authored.baseline, undefined);
  assert.equal(authored.operation, 'alias');
  assert.equal(authored.groupId, 'text-group');
  assert.equal(authored.modeId, 'default');
  assert.deepEqual(authored.sources, ['source']);
  assert.equal(RelationshipConstraint.allows(
    input,
    {},
    'text',
    RelationshipConstraintFixture.candidate(baseline, { 'lightness': baseline.oklch.l + 0.1 })
  ), true);
  assert.deepEqual(RelationshipConstraint.relationIds(input, ['text']), ['text-from-source']);
});

void test('RelationshipConstraintDomain projects exact and tolerant coordinate envelopes', () => {
  const exact = RelationshipConstraintDomain.coordinateRange({
    'baseline': [0.6, 0.6],
    'envelope': [0, 1],
    'maximum': 1,
    'minimum': 0,
    'tolerance': undefined
  });
  const tolerant = RelationshipConstraintDomain.coordinateRange({
    'baseline': [0.45, 0.75],
    'envelope': [0.3, 0.8],
    'maximum': 1,
    'minimum': 0,
    'tolerance': 0.1
  });
  const outside = RelationshipConstraintDomain.coordinateRange({
    'baseline': [0.1, 0.2],
    'envelope': [0.7, 0.9],
    'maximum': 1,
    'minimum': 0,
    'tolerance': 0
  });
  const runtime = RelationshipConstraintDomain.coordinateRange({
    'baseline': [0.6, 0.6],
    'envelope': [0.3, 0.8],
    'maximum': 1,
    'minimum': 0,
    'tolerance': 0.1
  });

  assert.deepEqual(exact, [0.6, 0.6]);
  assert.deepEqual(tolerant, [0.35, 0.8]);
  assert.deepEqual(outside, [0.7, 0.7]);
  assert.ok(tolerant[0] <= runtime[0] && tolerant[1] >= runtime[1], 'the authored source envelope contains every runtime baseline interval');
});

void test('RelationshipConstraint reuses one domain for repeated calls on one graph and resolution record', () => {
  const baseline = colorRecordFactory.fromHex('#777777');
  const input = RelationshipConstraintFixture.input({ 'tolerance': { 'lightness': 0.03 } });
  const metadata = RelationshipConstraintFixture.metadata(baseline);
  const domain = RelationshipConstraint.domain(input, metadata, 'text');

  assert.ok(domain !== undefined);
  for (let index = 0; index < 8; index += 1) {
    assert.equal(RelationshipConstraint.allows(input, metadata, 'text', baseline), true);
    assert.strictEqual(RelationshipConstraint.domain(input, metadata, 'text'), domain);
  }
});

void test('RelationshipConstraint rebuilds a domain after relationship resolution metadata changes', () => {
  const baseline = colorRecordFactory.fromHex('#777777');
  const replacement = RelationshipConstraintFixture.candidate(baseline, {
    'lightness': baseline.oklch.l + 0.1
  });
  const input = RelationshipConstraintFixture.input();
  const metadata = RelationshipConstraintFixture.metadata(baseline);
  const initial = RelationshipConstraint.domain(input, metadata, 'text');

  Metadata.writeRelationshipResolution(metadata, new Map([['text', RelationshipResolutionEntity.create({
    'after': replacement,
    'disposition': 'applied',
    'groupId': 'text-group',
    'operation': 'alias',
    'relationshipId': 'text-from-source',
    'sources': ['source']
  })]]));
  const updated = RelationshipConstraint.domain(input, metadata, 'text');

  assert.ok(initial !== undefined);
  assert.ok(updated !== undefined);
  assert.notStrictEqual(updated, initial);
  assert.equal(updated.baseline?.hex, replacement.hex);
  assert.equal(RelationshipConstraint.allows(input, metadata, 'text', baseline), false);
  assert.equal(RelationshipConstraint.allows(input, metadata, 'text', replacement), true);
});

void test('RelationshipConstraint keeps relationship domains scoped to the current run metadata', () => {
  const firstBaseline = colorRecordFactory.fromHex('#777777');
  const secondBaseline = RelationshipConstraintFixture.candidate(firstBaseline, {
    'lightness': firstBaseline.oklch.l + 0.1
  });
  const input = RelationshipConstraintFixture.input();
  const firstMetadata = RelationshipConstraintFixture.metadata(firstBaseline);
  const secondMetadata = RelationshipConstraintFixture.metadata(secondBaseline);

  const first = RelationshipConstraint.domain(input, firstMetadata, 'text');
  const second = RelationshipConstraint.domain(input, secondMetadata, 'text');

  assert.ok(first !== undefined);
  assert.ok(second !== undefined);
  assert.equal(first.baseline?.hex, firstBaseline.hex);
  assert.equal(second.baseline?.hex, secondBaseline.hex);
  assert.equal(RelationshipConstraint.allows(input, secondMetadata, 'text', firstBaseline), false);
  assert.equal(RelationshipConstraint.allows(input, secondMetadata, 'text', secondBaseline), true);
});

void test('RelationshipConstraint resolves authored default hue-offset degrees without a runtime baseline', () => {
  const roles = RoleSchemaEntity.intake({
    'contrastPairs': [],
    'name': 'hue-domain',
    'relationshipGraph': {
      'groups': [{
        'anchor': 'source',
        'defaultMode': 'triadic',
        'id': 'hue-group',
        'modes': [{ 'hueOffsets': [{ 'degrees': 120, 'variantId': 'primary' }], 'id': 'triadic' }],
        'name': 'Hue',
        'relationships': [{
          'id': 'target-hue',
          'operation': 'hue-offset',
          'priority': 0,
          'relaxability': 'fixed',
          'source': 'source',
          'target': 'target',
          'variantId': 'primary'
        }]
      }]
    },
    'roles': [{ 'name': 'source' }, { 'name': 'target' }]
  });
  const input = InputEntity.intake({ 'colors': [], 'roles': roles });
  const domain = RelationshipConstraint.domain(input, {}, 'target');

  assert.ok(domain !== undefined);
  assert.equal(domain.operation, 'hue-offset');
  assert.equal(domain.modeId, 'triadic');
  assert.equal(domain.hueDegrees, 120);
  assert.deepEqual(domain.sources, ['source']);
  assert.equal(domain.baseline, undefined);
});

void test('RelationshipConstraint exposes authored OKLCH delta data without a runtime baseline', () => {
  const roles = RoleSchemaEntity.intake({
    'contrastPairs': [],
    'name': 'delta-domain',
    'relationshipGraph': {
      'groups': [{
        'anchor': 'source',
        'defaultMode': 'default',
        'id': 'delta-group',
        'modes': [{ 'hueOffsets': [{ 'degrees': 0, 'variantId': 'base' }], 'id': 'default' }],
        'name': 'Delta',
        'relationships': [{
          'chromaScale': 0.7,
          'hueOffset': -24,
          'id': 'target-delta',
          'lightnessOffset': 0.1,
          'operation': 'oklch-delta',
          'priority': 0,
          'relaxability': 'tolerant',
          'source': 'source',
          'target': 'target',
          'tolerance': { 'chroma': 0.02, 'lightness': 0.03 }
        }]
      }]
    },
    'roles': [{ 'name': 'source' }, { 'name': 'target' }]
  });
  const input = InputEntity.intake({ 'colors': [], 'roles': roles });
  const domain = RelationshipConstraint.domain(input, {}, 'target');

  assert.ok(domain !== undefined);
  assert.equal(domain.operation, 'oklch-delta');
  if (domain.relationship.operation !== 'oklch-delta') {
    throw new TypeError('RelationshipConstraint domain must retain the OKLCH delta operation');
  }
  assert.equal(domain.relationship.lightnessOffset, 0.1);
  assert.equal(domain.relationship.chromaScale, 0.7);
  assert.equal(domain.relationship.hueOffset, -24);
  assert.equal(domain.tolerance?.lightness, 0.03);
  assert.equal(domain.baseline, undefined);
});

void test('enforce:contrast retains a relationship-fixed role and reports its relation constraint', () => {
  const baseline = colorRecordFactory.fromHex('#777777');
  const input = RelationshipConstraintFixture.input();
  const state = RelationshipConstraintFixture.engine(input, baseline).run(input);
  const report = Metadata.contrastReport(state.metadata);
  const [pair] = report?.problemPairs ?? [];

  assert.ok(pair !== undefined);
  assert.equal(pair.passed, false);
  assert.deepEqual(pair.constraints, ['hue-relationship']);
  assert.deepEqual(pair.relationIds, ['text-from-source']);
  assert.equal(state.roles.text?.hex, baseline.hex);
});

void test('enforce:contrast preserves an unconstrained terminal inside a relationship domain', () => {
  const baseline = colorRecordFactory.fromHex('#777777');
  const tolerance = { 'alpha': 1, 'chroma': 0.5, 'hue': 180, 'lightness': 1 };
  const unconstrainedInput = RelationshipConstraintFixture.inputWithoutRelationship({
    'minimumContrastRatio': 4.5,
    'tolerance': tolerance
  });
  const constrainedInput = RelationshipConstraintFixture.input({
    'minimumContrastRatio': 4.5,
    'tolerance': tolerance
  });
  const unconstrained = RelationshipConstraintFixture.engine(unconstrainedInput, baseline).run(unconstrainedInput);
  const constrained = RelationshipConstraintFixture.engine(constrainedInput, baseline).run(constrainedInput);

  assert.equal(constrained.roles.text?.hex, unconstrained.roles.text?.hex);
  assert.equal(Metadata.contrastReport(constrained.metadata)?.compliant, true);
});

void test('RelationshipConstraint admits the on-brand near-white terminal inside its declared domain', () => {
  const baseline = colorRecordFactory.fromHex('#0a1018');
  const terminal = colorRecordFactory.fromHex('#ffffff');
  const input = RelationshipConstraintFixture.input({
    'tolerance': { 'alpha': 1, 'chroma': 0.5, 'hue': 180, 'lightness': 1 }
  });
  const metadata = RelationshipConstraintFixture.metadata(baseline);

  assert.ok(terminal.oklch.c < 1e-7);
  assert.equal(RelationshipConstraint.allows(input, metadata, 'text', terminal), true);
});

void test('RelationshipConstraint ignores hue for fixed and tolerant near-achromatic coordinates', () => {
  const baseline = colorRecordFactory.fromOklch(0.65, hueResolutionChroma / 2, 0);
  const metadata = RelationshipConstraintFixture.metadata(baseline);
  const fixed = RelationshipConstraintFixture.input();
  const tolerant = RelationshipConstraintFixture.input({ 'tolerance': { 'hue': 0 } });
  const candidate = ColorCoordinate.fromOklch(0.65, hueResolutionChroma / 2, 180);

  assert.equal(RelationshipConstraint.allowsCoordinates(fixed, metadata, 'text', 1, candidate), true);
  assert.equal(RelationshipConstraint.allowsCoordinates(tolerant, metadata, 'text', 1, candidate), true);
});

void test('RelationshipConstraint enforces hue above the emitted hue-resolution chroma', () => {
  const baseline = colorRecordFactory.fromOklch(0.65, hueResolutionChroma * 2, 0);
  const metadata = RelationshipConstraintFixture.metadata(baseline);
  const fixed = RelationshipConstraintFixture.input();
  const tolerant = RelationshipConstraintFixture.input({ 'tolerance': { 'hue': 5 } });
  const candidate = ColorCoordinate.fromOklch(0.65, hueResolutionChroma * 2, 6);

  assert.equal(RelationshipConstraint.allowsCoordinates(fixed, metadata, 'text', 1, candidate), false);
  assert.equal(RelationshipConstraint.allowsCoordinates(tolerant, metadata, 'text', 1, candidate), false);
});

void test('RelationshipConstraint admits the VS Code onAccent terminal from an achromatic relationship baseline', () => {
  const baseline = colorRecordFactory.fromOklch(1, 0, 0);
  const terminal = colorRecordFactory.fromHex('#050300');
  const input = RelationshipConstraintFixture.input({
    'tolerance': { 'alpha': 1, 'chroma': 0.5, 'hue': 5, 'lightness': 1 }
  });
  const metadata = RelationshipConstraintFixture.metadata(baseline);

  assert.ok(baseline.oklch.c < hueResolutionChroma);
  assert.ok(terminal.oklch.c > hueResolutionChroma);
  assert.equal(RelationshipConstraint.allows(input, metadata, 'text', terminal), true);
});

void test('RelationshipConstraint admits the on-brand terminal from an achromatic relationship baseline', () => {
  const baseline = colorRecordFactory.fromOklch(1, 0, 0);
  const terminal = colorRecordFactory.fromHex('#fafafa');
  const input = RelationshipConstraintFixture.input({
    'tolerance': { 'alpha': 1, 'chroma': 0.5, 'hue': 5, 'lightness': 1 }
  });
  const metadata = RelationshipConstraintFixture.metadata(baseline);

  assert.ok(terminal.oklch.c < hueResolutionChroma);
  assert.equal(RelationshipConstraint.allows(input, metadata, 'text', terminal), true);
});

void test('enforce:contrast records deviation without replacing a tolerant resolution baseline', () => {
  const baseline = colorRecordFactory.fromHex('#777777');
  const input = RelationshipConstraintFixture.input({
    'minimumContrastRatio': 4.5,
    'tolerance': {
      'alpha': 1,
      'chroma': 0.5,
      'hue': 360,
      'lightness': 0.1
    }
  });
  const state = RelationshipConstraintFixture.engine(input, baseline).run(input);
  const resolution = Metadata.relationshipResolution(state.metadata).get('text');

  assert.equal(Metadata.contrastReport(state.metadata)?.compliant, true);
  assert.equal(resolution?.after?.hex, baseline.hex);
  assert.ok((resolution?.deviation?.lightness ?? 0) > 0);
  assert.notEqual(state.roles.text?.hex, baseline.hex);
});
