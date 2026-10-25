import { colorRecordFactory } from '@studnicky/iridis';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CvdEvaluator } from '../../src/CvdEvaluator.ts';
import { CvdFailurePolicy } from '../../src/CvdFailurePolicy.ts';
import { cvdMatrices } from '../../src/data/cvdMatrices.ts';
import { CVD_THRESHOLDS } from '../../src/data/cvdThresholds.ts';
import { CvdPairWarningEntity } from '../../src/entities/CvdPairWarningEntity.ts';

await test('CvdEvaluator evaluates every configured matrix deterministically', () => {
  const foreground = colorRecordFactory.fromHex('#d00000');
  const background = colorRecordFactory.fromHex('#008000');
  const policy = CvdFailurePolicy.resolve({ 'cvdMode': 'enforce' });
  const evaluations = CvdEvaluator.evaluate(
    foreground.rgb,
    background.rgb,
    4.5,
    4.5,
    policy
  );

  assert.deepStrictEqual(
    evaluations.map((evaluation) => { return evaluation.cvdType; }),
    cvdMatrices.map((matrix) => { return matrix.name; }),
    'the evaluator covers every configured deficiency matrix in configured order'
  );
  for (let index = 0; index < evaluations.length; index += 1) {
    const evaluation = evaluations[index];
    assert.ok(evaluation !== undefined, 'each configured matrix has an evaluation');
    const matrix = cvdMatrices[index];
    assert.ok(matrix !== undefined, 'each evaluation maps to a configured matrix');
    const expectedContrast = CvdEvaluator.contrast(
      CvdEvaluator.color(foreground.rgb, matrix),
      CvdEvaluator.color(background.rgb, matrix)
    );
    assert.strictEqual(
      evaluation.simContrast,
      expectedContrast,
      `${matrix.name} uses the canonical simulated contrast measurement`
    );
  }
});

await test('CvdEvaluator keeps correction and warning boundaries explicit at one picounit', () => {
  const policy = CvdFailurePolicy.resolve({ 'cvdMode': 'enforce' });
  const protanopia = cvdMatrices[0];
  if (protanopia === undefined) {
    throw new TypeError('Protanopia matrix is required for the boundary test');
  }
  const threshold = CVD_THRESHOLDS.protanopia;
  const floorPass = CvdEvaluator.evaluateMeasurements(
    protanopia,
    4,
    threshold.minimumSimulatedContrast - 0.5e-12,
    0,
    policy
  );
  const floorFail = CvdEvaluator.evaluateMeasurements(
    protanopia,
    4,
    threshold.minimumSimulatedContrast - 2e-12,
    0,
    policy
  );
  const dropPass = CvdEvaluator.evaluateMeasurements(
    protanopia,
    4,
    4 - threshold.dropMagnitude - 0.5e-12,
    0,
    policy
  );
  const dropFail = CvdEvaluator.evaluateMeasurements(
    protanopia,
    4,
    4 - threshold.dropMagnitude - 2e-12,
    0,
    policy
  );

  assert.strictEqual(floorPass.belowFloor, false, 'correction floor allows sub-epsilon rounding');
  assert.strictEqual(floorFail.belowFloor, true, 'correction floor fails beyond epsilon');
  assert.strictEqual(dropPass.exceedsDrop, false, 'correction drop allows sub-epsilon rounding');
  assert.strictEqual(dropFail.exceedsDrop, true, 'correction drop fails beyond epsilon');

  const warningDrop = threshold.dropMagnitude;
  const warningSimulatedContrast = 4 - warningDrop;
  const warning = CvdPairWarningEntity.intake({
    'background': 'background',
    'cvdType': 'protanopia',
    'drop': warningDrop,
    'dropThreshold': threshold.dropMagnitude,
    'foreground': 'foreground',
    'minimumSimulatedContrast': threshold.minimumSimulatedContrast,
    'originalLuminanceContrast': 4,
    'simulatedContrastDropRatio': 0,
    'simulatedContrastRatio': 0,
    'simulatedLuminanceContrast': warningSimulatedContrast
  });
  const terminalExceedsDrop = Math.abs(warning.drop) > warning.dropThreshold;
  const warningEvidence = CvdEvaluator.fromWarning(warning, policy);
  assert.strictEqual(
    warningEvidence.exceedsDrop,
    terminalExceedsDrop,
    'terminal warning evidence classifies the exact boundary strictly'
  );
});
