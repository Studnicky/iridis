import { ContrastFeasibilityReportEntity } from '@studnicky/iridis-contrast';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildSchemaFeasibilityRows } from '../app/components/content/schema/buildSchemaFeasibilityRows.ts';

await test('schema feasibility rows distinguish certified, sampled, and constrained pairs', () => {
  const report = ContrastFeasibilityReportEntity.intake({
    'pairs': [
      { 'background': 'background', 'foreground': 'text', 'reachability': 'always-reachable', 'reachableHueRanges': [] },
      {
        'background': 'background',
        'foreground': 'border',
        'proof': {
          'bestActual': 2.8,
          'limitingBounds': [{ 'channel': 'lightness', 'edge': 'maximum', 'role': 'border', 'value': 0.5 }],
          'missingLuminance': 0.1,
          'required': 4.5,
          'shortfall': 1.7
        },
        'reachability': 'never-reachable',
        'reachableHueRanges': []
      },
      {
        'background': 'background',
        'foreground': 'accent',
        'reachability': 'reachable-only-for-some-hues',
        'reachableHueRanges': [{ 'end': 90, 'start': 30 }]
      },
      {
        'background': 'background',
        'foreground': 'semantic',
        'reachability': 'indeterminate',
        'reachableHueRanges': [],
        'sampled': { 'bestActual': 5.2, 'testedHues': [0, 120, 240] }
      }
    ]
  });

  const rows = buildSchemaFeasibilityRows.build(report);

  assert.deepEqual(rows.map((row) => { return [row.id, row.status]; }), [
    ['text/background', 'Always reachable'],
    ['border/background', 'Never reachable'],
    ['accent/background', 'Some hues'],
    ['semantic/background', 'Indeterminate']
  ]);
  assert.deepEqual(rows.map((row) => { return row.color; }), ['success', 'error', 'warning', 'neutral']);
  assert.equal(rows[1]?.detail.includes('border lightness maximum 0.50'), true);
  assert.equal(rows[2]?.detail, 'Reachable at 30°–90°');
  assert.equal(rows[3]?.detail, 'Sampled best 5.20; not proof');
});
