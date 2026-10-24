import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ContrastConfigFor } from '../app/composables/contrastConfigFor.ts';
import { ContrastConfigOptionsEntity } from '../app/composables/entities/ContrastConfigOptionsEntity.ts';
import { CvdModeEntity } from '../app/composables/entities/CvdModeEntity.ts';
import { NonMandatoryLevelEntity } from '../app/composables/entities/NonMandatoryLevelEntity.ts';

await test('the demo defaults are nudge and AA', () => {
  assert.equal(CvdModeEntity.defaultValue, 'nudge');
  assert.equal(NonMandatoryLevelEntity.defaultValue, 'AA');
});

await test('forOptions produces the exact entity for every strictness, cvdMode and nonMandatoryLevel combination', () => {
  const standards = [
    { 'algorithm': 'wcag21', 'level': 'AA', 'strictness': 0 },
    { 'algorithm': 'wcag21', 'level': 'AAA', 'strictness': 1 },
    { 'algorithm': 'apca', 'level': 'Lc', 'strictness': 2 }
  ] as const;
  const modes = ['warn', 'nudge', 'enforce'] as const;
  const levels = ['AA', 'AAA'] as const;
  let combinations = 0;
  for (let standardIndex = 0; standardIndex < standards.length; standardIndex += 1) {
    const standard = standards[standardIndex]!;
    for (let modeIndex = 0; modeIndex < modes.length; modeIndex += 1) {
      const cvdMode = modes[modeIndex]!;
      for (let levelIndex = 0; levelIndex < levels.length; levelIndex += 1) {
        const nonMandatoryLevel = levels[levelIndex]!;
        const options = ContrastConfigOptionsEntity.create({ 'cvdMode': cvdMode, 'enableStrictCompliance': false, 'nonMandatoryLevel': nonMandatoryLevel, 'strictness': standard.strictness });
        assert.deepEqual(ContrastConfigFor.forOptions(options), {
          'algorithm': standard.algorithm,
          'cvdMode': cvdMode,
          'enableStrictCompliance': false,
          'level': standard.level,
          'nonMandatoryLevel': nonMandatoryLevel
        });
        combinations += 1;
      }
    }
  }
  assert.equal(combinations, 18);
});

await test('the options entity rejects an unknown cvdMode', () => {
  assert.throws(() => {
    ContrastConfigOptionsEntity.intake({ 'cvdMode': 'loud', 'enableStrictCompliance': false, 'nonMandatoryLevel': 'AA', 'strictness': 0 });
  });
});

await test('forOptions forwards enableStrictCompliance for every standard', () => {
  const enabledStates = [true, false] as const;
  for (let strictness = 0; strictness <= 2; strictness += 1) {
    for (let index = 0; index < enabledStates.length; index += 1) {
      const enabled = enabledStates[index]!;
      const options = ContrastConfigOptionsEntity.create({ 'cvdMode': 'nudge', 'enableStrictCompliance': enabled, 'nonMandatoryLevel': 'AA', 'strictness': strictness });
      assert.equal(ContrastConfigFor.forOptions(options).enableStrictCompliance, enabled);
    }
  }
});
