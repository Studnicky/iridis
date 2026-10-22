import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildCvdWarningRowModel } from '../app/components/content/buildCvdWarningRowModel.ts';

await test('buildCvdWarningRowModel reports luminance ratios and retention as a percentage', () => {
  const model = buildCvdWarningRowModel.build({
    'background': 'surface',
    'cvdType': 'deuteranopia',
    'drop': 3.8,
    'dropThreshold': 0.3,
    'foreground': 'text',
    'minimumSimulatedContrast': 3,
    'originalLuminanceContrast': 7,
    'simulatedContrastDropRatio': 0.543,
    'simulatedContrastRatio': 0.457,
    'simulatedLuminanceContrast': 3.2
  });
  assert.equal(model.originalRatio, '7.00');
  assert.equal(model.simulatedRatio, '3.20');
  assert.equal(model.retainedPercent, '45.7');
});
