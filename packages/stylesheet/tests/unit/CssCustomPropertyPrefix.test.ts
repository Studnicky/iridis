import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CssCustomPropertyPrefix } from '../../src/util/CssCustomPropertyPrefix.ts';
import { CssCustomPropertyPrefixTestData } from '../fixtures/CssCustomPropertyPrefixTestData.ts';

class CssCustomPropertyPrefixTestFixture {
  static errorFor(prefix: string): Error | undefined {
    try {
      CssCustomPropertyPrefix.from(prefix);
      return undefined;
    } catch (error) {
      const result = error instanceof Error ? error : undefined;
      return result;
    }
  }
}

await test('CssCustomPropertyPrefix.from uses the default for absent metadata', () => {
  assert.strictEqual(CssCustomPropertyPrefix.from(undefined), '--c-');
});

await test('CssCustomPropertyPrefix.from preserves a valid custom prefix', () => {
  assert.strictEqual(CssCustomPropertyPrefix.from('--brand-'), '--brand-');
});

await test('CssCustomPropertyPrefix.from rejects declaration and rule injection text', () => {
  for (let index = 0; index < CssCustomPropertyPrefixTestData.INVALID_PREFIXES.length; index += 1) {
    const prefix = CssCustomPropertyPrefixTestData.INVALID_PREFIXES[index];
    if (prefix === undefined) { continue; }
    const error = CssCustomPropertyPrefixTestFixture.errorFor(prefix);
    assert.match(error?.message ?? '', CssCustomPropertyPrefixTestData.ERROR_PATTERN);
  }
});
