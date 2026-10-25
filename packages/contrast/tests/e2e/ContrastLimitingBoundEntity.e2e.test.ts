import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ContrastLimitingBoundEntity } from '../../src/entities/ContrastLimitingBoundEntity.ts';

void test('ContrastLimitingBoundEntity admits a relationship-derived limit', () => {
  const bound = ContrastLimitingBoundEntity.intake({
    'channel': 'hue-relationship',
    'edge': 'fixed',
    'role': 'on-brand',
    'value': 0.72
  });

  assert.equal(bound.channel, 'hue-relationship');
});

void test('ContrastLimitingBoundEntity rejects an unknown reachability limit channel', () => {
  assert.throws(() => {
    ContrastLimitingBoundEntity.intake({
      'channel': 'unbounded',
      'edge': 'fixed',
      'role': 'on-brand',
      'value': 0.72
    });
  });
});
