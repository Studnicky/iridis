import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ContrastPairEntity } from '../../src/entities/ContrastPairEntity.ts';
import { InputEntity } from '../../src/entities/InputEntity.ts';
import { PaletteRoleState } from '../../src/interfaces/PaletteStateInterface.ts';
import { colorRecordFactory } from '../../src/math/ColorRecordFactory.ts';
import { ContrastPolicy } from '../../src/tasks/enforce/ContrastPolicy.ts';

class PairClassScenario {
  static readonly roles = PaletteRoleState.admit({
    'background': colorRecordFactory.fromHex('#10161f'),
    'mark': colorRecordFactory.fromHex('#6d28d9')
  });

  static requirement(
    contrastClass: string,
    minimumContrastRatio: number | undefined,
    contrast: Readonly<Record<string, string>>
  ): ContrastPolicy.RequirementInterface {
    const pair = {
      'background': 'background',
      'contrastClass': contrastClass,
      'foreground': 'mark',
      ...(minimumContrastRatio === undefined ? {} : { 'minimumContrastRatio': minimumContrastRatio })
    };
    const requirements = ContrastPolicy.normalize(
      InputEntity.intake({
        'colors': [],
        'contrast': {
          'algorithm': 'wcag21',
          ...contrast
        },
        'roles': {
          'contrastPairs': [pair],
          'name': 'pair-class',
          'roles': []
        }
      }),
      PairClassScenario.roles
    );
    const result = requirements[0];

    if (result === undefined) {
      throw new Error('The pair did not normalize to a requirement');
    }

    return result;
  }
}

await test('a contrast pair requires an explicit class', () => {
  assert.strictEqual(ContrastPairEntity.validate({
    'background': 'background',
    'foreground': 'mark'
  }), false);
  assert.strictEqual(ContrastPairEntity.validate({
    'background': 'background',
    'contrastClass': 'graphic',
    'foreground': 'mark'
  }), false);
  const classes = [
    'text',
    'non-text',
    'ui'
  ];

  for (let index = 0; index < classes.length; index += 1) {
    assert.strictEqual(
      ContrastPairEntity.validate({
        'background': 'background',
        'contrastClass': classes[index] ?? '',
        'foreground': 'mark'
      }),
      true,
      classes[index]
    );
  }
});

await test('text pairs follow the selected text level', () => {
  assert.strictEqual(PairClassScenario.requirement('text', undefined, { 'level': 'AA' }).minimumContrastRatio, 4.5);
  assert.strictEqual(PairClassScenario.requirement('text', undefined, { 'level': 'AAA' }).minimumContrastRatio, 7);
  assert.strictEqual(PairClassScenario.requirement('text', 4.5, { 'level': 'AAA' }).minimumContrastRatio, 7);
  assert.strictEqual(PairClassScenario.requirement('text', 10, { 'level': 'AA' }).minimumContrastRatio, 10);
  assert.strictEqual(PairClassScenario.requirement('text', 4.5, { 'level': 'AAA' }).target, 'AAA');
});

await test('non-text and ui pairs follow the non-mandatory level and share one floor', () => {
  const classes = [
    'non-text',
    'ui'
  ];

  for (let index = 0; index < classes.length; index += 1) {
    const contrastClass = classes[index] ?? '';
    const strictText = PairClassScenario.requirement(contrastClass, 3, { 'level': 'AAA' });

    assert.strictEqual(strictText.minimumContrastRatio, 3, contrastClass);
    assert.strictEqual(strictText.target, 'AA', contrastClass);
    const strictNonText = PairClassScenario.requirement(contrastClass, 3, {
      'level': 'AA',
      'nonMandatoryLevel': 'AAA'
    });

    assert.strictEqual(strictNonText.minimumContrastRatio, 4.5, contrastClass);
    assert.strictEqual(strictNonText.target, 'AAA', contrastClass);
    assert.strictEqual(PairClassScenario.requirement(contrastClass, undefined, { 'level': 'AA' }).minimumContrastRatio, 3, contrastClass);
    assert.strictEqual(
      PairClassScenario.requirement(contrastClass, undefined, {
        'level': 'AA',
        'nonMandatoryLevel': 'AAA'
      }).minimumContrastRatio,
      4.5,
      contrastClass
    );
  }
});

await test('the class travels on the normalized requirement', () => {
  assert.strictEqual(PairClassScenario.requirement('ui', 3, { 'level': 'AA' }).contrastClass, 'ui');
  assert.strictEqual(PairClassScenario.requirement('text', 4.5, { 'level': 'AA' }).contrastClass, 'text');
});
