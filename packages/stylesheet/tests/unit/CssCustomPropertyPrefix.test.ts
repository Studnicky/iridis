import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CssCustomPropertyPrefix } from '../../src/util/CssCustomPropertyPrefix.ts';

const INVALID_PREFIXES = [
  '--safe-} body {',
  '--safe-;',
  '--safe:',
  '--safe prefix-',
  '--safe-\n',
  '--safe-/*comment*/',
  'brand-',
  ''
];

class CssCustomPropertyPrefixTestFixture {
  static errorFor(prefix: string): Error | undefined {
    try {
      CssCustomPropertyPrefix.from(prefix);
      return undefined;
    } catch (error) {
      return error instanceof Error ? error : undefined;
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
  for (const prefix of INVALID_PREFIXES) {
    const error = CssCustomPropertyPrefixTestFixture.errorFor(prefix);
    assert.match(error?.message ?? '', /value must be a CSS custom-property prefix/u);
  }
});
