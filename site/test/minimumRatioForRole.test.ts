import { RoleSchemaEntity } from '@studnicky/iridis';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { minimumRatioForRole } from '../app/utils/minimumRatioForRole.ts';

const SCHEMA = RoleSchemaEntity.create({
  'contrastPairs': [
    {
      'background': 'background',
      'contrastClass': 'non-text',
      'foreground': 'divider',
      'minimumContrastRatio':   3
    }
  ],
  'name':        'minimum-ratio-test',
  'roles':       []
});

await test('minimumRatioForRole returns the declared foreground contrast target', () => {
  assert.equal(minimumRatioForRole(SCHEMA, 'divider'), 3);
});

await test('minimumRatioForRole falls back to WCAG AA when no foreground pair resolves', () => {
  assert.equal(minimumRatioForRole(SCHEMA, 'background'), 4.5);
  assert.equal(minimumRatioForRole(undefined, 'divider'), 4.5);
});

await test('minimumRatioForRole falls back when the matching pair has no numeric target', () => {
  const schema = RoleSchemaEntity.create({
    'contrastPairs': [
      {
        'background': 'background',
        'contrastClass': 'text',
        'foreground': 'divider'
      }
    ],
    'name':        'minimum-ratio-optional-target-test',
    'roles':       []
  });

  assert.equal(minimumRatioForRole(schema, 'divider'), 4.5);
});
