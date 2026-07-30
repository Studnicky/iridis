import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CssAttributeSelector } from '../../src/util/CssAttributeSelector.ts';

const HOSTILE_VALUES = [
  "brand'quoted",
  'brand"quoted',
  'brand\\escaped',
  'brand\nnewline',
  'brand}body{color:red',
  "brand'] body, [data-owned='true"
];

class CssAttributeSelectorTestFixture {
  static attributeNameError(attributeName: string): Error | undefined {
    try {
      CssAttributeSelector.from(attributeName, 'brand-blue');
      return undefined;
    } catch (error) {
      return error instanceof Error ? error : undefined;
    }
  }

  static emptyValueError(): Error | undefined {
    try {
      CssAttributeSelector.from('data-theme', '');
      return undefined;
    } catch (error) {
      return error instanceof Error ? error : undefined;
    }
  }

  static valueError(value: string): Error | undefined {
    try {
      CssAttributeSelector.from('data-theme', value);
      return undefined;
    } catch (error) {
      return error instanceof Error ? error : undefined;
    }
  }
}

await test('CssAttributeSelector.from preserves a valid hyphenated value', () => {
  assert.strictEqual(
    CssAttributeSelector.from('data-app-theme', 'brand-blue'),
    "[data-app-theme='brand-blue']"
  );
});

await test('CssAttributeSelector.from escapes hostile values inside one selector', () => {
  for (const value of HOSTILE_VALUES) {
    const selector = CssAttributeSelector.from('data-theme', value);
    assert.match(selector, /^\[data-theme='(?:[A-Za-z0-9_-]|\\[0-9A-F]+ )+'\]$/u);
    assert.strictEqual(selector.match(/\[/gu)?.length, 1);
    assert.strictEqual(selector.match(/\]/gu)?.length, 1);
    assert.ok(!selector.includes('{'));
    assert.ok(!selector.includes('}'));
    assert.ok(!selector.includes('\n'));
  }
});

await test('CssAttributeSelector.from rejects unsafe attribute names', () => {
  const hostileAttributeNames = [
    "data-theme'",
    'data-theme\\',
    'data-theme\nbody',
    'data-theme\u0000control',
    'data-theme}body{',
    'data-theme] body, [data-owned'
  ];

  for (const attributeName of hostileAttributeNames) {
    const error = CssAttributeSelectorTestFixture.attributeNameError(attributeName);
    assert.match(error?.message ?? '', /attributeName must be a CSS-safe identifier/u);
  }
});

await test('CssAttributeSelector.from rejects an empty attribute value', () => {
  const error = CssAttributeSelectorTestFixture.emptyValueError();
  assert.match(error?.message ?? '', /value must not be empty/u);
});

await test('CssAttributeSelector.from rejects NUL and lone UTF-16 surrogates', () => {
  const invalidValues = [
    'brand\u0000control',
    `brand${String.fromCharCode(0xD800)}high`,
    `brand${String.fromCharCode(0xDFFF)}low`
  ];
  for (const value of invalidValues) {
    const error = CssAttributeSelectorTestFixture.valueError(value);
    assert.match(error?.message ?? '', /value must contain only non-NUL Unicode scalar values/u);
  }
});

await test('CssAttributeSelector.from preserves astral values without replacement collision', async () => {
  const astralValue = 'brand-🚀';
  const selector = CssAttributeSelector.from('data-theme', astralValue);
  const browser = await chromium.launch({ 'headless': true });
  try {
    const page = await browser.newPage();
    await page.setContent([
      `<div id="exact" data-theme="${astralValue}"></div>`,
      '<div id="replacement" data-theme="brand-�"></div>'
    ].join(''));
    const matches = page.locator(selector);
    assert.strictEqual(await matches.count(), 1);
    assert.strictEqual(await matches.first().getAttribute('id'), 'exact');
  } finally {
    await browser.close();
  }
});
