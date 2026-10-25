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
import { colorRecordFactory } from '../../src/math/ColorRecordFactory.ts';
import { RelationshipConstraint } from '../../src/model/RelationshipConstraint.ts';
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
