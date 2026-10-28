import type { ThemeRegistration } from 'shiki';

import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as VueModule from 'vue';

import { globalVscodeTheme } from '../app/composables/globalVscodeTheme.ts';
import { highlightCode } from '../app/theme/highlightCode.ts';

class HighlightCodeFixture {
  static readonly darkTheme = {
    'colors': {
      'editor.background': '#121212',
      'editor.foreground': '#ededed'
    },
    'name': 'iridis-test-dark',
    'tokenColors': [
      {
        'name': 'Keyword',
        'scope': ['keyword'],
        'settings': { 'foreground': '#e88bd7' }
      }
    ],
    'type': 'dark'
  } satisfies ThemeRegistration;

  static readonly lightTheme = {
    'colors': {
      'editor.background': '#f7f7f7',
      'editor.foreground': '#171717'
    },
    'tokenColors': [
      {
        'name': 'Keyword',
        'scope': 'keyword',
        'settings': { 'foreground': '#9c2a80' }
      }
    ],
    'type': 'light'
  } satisfies ThemeRegistration;
}

await test('renders the nameless site theme shape and a named dark theme through Shiki', async () => {
  const lightRuleCount = HighlightCodeFixture.lightTheme.tokenColors.length;
  const darkRuleCount = HighlightCodeFixture.darkTheme.tokenColors.length;
  const [lightHtml, darkHtml] = await Promise.all([
    highlightCode('if (answer) {}', 'javascript', HighlightCodeFixture.lightTheme),
    highlightCode('if (answer) {}', 'javascript', HighlightCodeFixture.darkTheme)
  ]);

  assert.equal(lightHtml.includes('background-color:#f7f7f7'), true);
  assert.equal(lightHtml.includes('color:#9C2A80'), true);
  assert.equal(darkHtml.includes('background-color:#121212'), true);
  assert.equal(darkHtml.includes('color:#E88BD7'), true);
  assert.equal(HighlightCodeFixture.lightTheme.tokenColors.length, lightRuleCount);
  assert.equal(HighlightCodeFixture.darkTheme.tokenColors.length, darkRuleCount);
});

await test('normalizes reactive VS Code themes before Shiki intake', async () => {
  const theme = VueModule.reactive(HighlightCodeFixture.darkTheme);

  assert.equal(VueModule.isReactive(theme), true);
  const html = await highlightCode('if (answer) {}', 'javascript', theme);
  assert.equal(html.includes('background-color:#121212'), true);
});

await test('colors keywords however long the tokenizer takes', async (context) => {
  let clock = 0;
  context.mock.method(Date, 'now', () => {
    clock += 1_000;
    return clock;
  });

  const html = await highlightCode('if (answer) {}', 'javascript', HighlightCodeFixture.lightTheme);

  assert.equal(html.includes('color:#9C2A80'), true);
});

await test('keeps the globally published VS Code theme cloneable for Shiki intake', async () => {
  const previousTheme = globalVscodeTheme.value;
  const emittedTheme = {
    'colors': { 'editor.background': '#121212' },
    'tokenColors': [{ 'scope': 'keyword', 'settings': { 'foreground': '#e88bd7' } }],
    'type': 'dark'
  };

  try {
    globalVscodeTheme.value = emittedTheme;
    assert.equal(VueModule.isReactive(globalVscodeTheme.value), false);
    assert.equal(globalVscodeTheme.value, emittedTheme);
    const html = await highlightCode('if (answer) {}', 'javascript', globalVscodeTheme.value);
    assert.equal(html.includes('background-color:#121212'), true);
  } finally {
    globalVscodeTheme.value = previousTheme;
  }
});

await test('renders the empty initial SSR theme using Shiki defaults', async () => {
  const html = await highlightCode('const answer = 42;', 'javascript', {});

  assert.equal(html.includes('background-color:#1e1e1e'), true);
  assert.equal(html.includes('color:#BBBBBB'), true);
});

await test('normalizes VS Code high-contrast modes to Shiki light and dark modes', async () => {
  const [lightHtml, darkHtml] = await Promise.all([
    highlightCode('const answer = 42;', 'javascript', {
      ...HighlightCodeFixture.lightTheme,
      'name': 'iridis-test-hc-light',
      'type': 'hc-light'
    }),
    highlightCode('const answer = 42;', 'javascript', {
      ...HighlightCodeFixture.darkTheme,
      'name': 'iridis-test-hc-dark',
      'type': 'hc-dark'
    })
  ]);

  assert.equal(lightHtml.includes('background-color:#f7f7f7'), true);
  assert.equal(darkHtml.includes('background-color:#121212'), true);
});

await test('rejects malformed VS Code themes before calling Shiki', async () => {
  await assert.rejects(
    highlightCode('const answer = 42;', 'javascript', {
      'colors': { 'editor.background': '#121212' },
      'name': 'invalid-theme',
      'tokenColors': [{ 'scope': 'keyword', 'settings': { 'foreground': 42 } }],
      'type': 'dark'
    }),
    { 'message': '/tokenColors/0/settings/foreground: must be string' }
  );
});

await test('rejects a non-string theme name when the optional property is present', async () => {
  await assert.rejects(
    highlightCode('const answer = 42;', 'javascript', {
      ...HighlightCodeFixture.darkTheme,
      'name': 42
    }),
    { 'message': '/name: must be string' }
  );
});
