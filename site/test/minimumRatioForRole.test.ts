import type { RoleSchemaInterfaceType } from '@studnicky/iridis/model';

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { minimumRatioForRole } from '../app/utils/minimumRatioForRole.ts';

const SCHEMA: RoleSchemaInterfaceType = {
  'contrastPairs': [
    {
      'algorithm':  undefined,
      'background': 'background',
      'foreground': 'divider',
      'minRatio':   3
    }
  ],
  'description': undefined,
  'name':        'minimum-ratio-test',
  'roles':       []
};

await test('minimumRatioForRole returns the declared foreground contrast target', () => {
  assert.equal(minimumRatioForRole(SCHEMA, 'divider'), 3);
});

await test('minimumRatioForRole falls back to WCAG AA when no foreground pair resolves', () => {
  assert.equal(minimumRatioForRole(SCHEMA, 'background'), 4.5);
  assert.equal(minimumRatioForRole(undefined, 'divider'), 4.5);
});
