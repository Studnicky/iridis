import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

import { DefaultThemeCss } from '../app/theme/DefaultThemeCss.ts';
import { TestPatterns } from './fixtures/TestPatterns.ts';

const SITE_ROOT = resolve(import.meta.dirname, '..');
const CHROME_STYLESHEETS = [
  'app/components/content/graph/GraphLegend.vue',
  'app/components/content/mermaid/ModalShell.css',
  'app/components/content/mermaid/explorer.css',
  'app/components/content/ui/UiCodeBlock.vue',
  'app/components/content/ui/UiCodeTabs.vue',
  'app/components/content/ui/UiLegendTitle.vue',
  'app/components/content/ui/UiTabs.vue',
  'app/components/content/viz/CodeSample.css',
  'app/components/content/viz/Dpad.css',
  'app/components/content/viz/ModalShell.css',
  'app/components/content/viz/ViewerActions.css',
  'app/components/content/viz/ViewerOverlay.css'
];

class SiteDesignSystemCssHarness {
  static collectTokens(css: string, pattern: RegExp): Set<string> {
    const tokens = new Set<string>();
    for (const match of css.matchAll(pattern)) {
      const token = match[1];
      if (token !== undefined) {tokens.add(token);}
    }
    return tokens;
  }
}

await test('visualization chrome uses only defined Iridis design-system tokens', () => {
  let chromeCss = '';
  for (const path of CHROME_STYLESHEETS) {chromeCss += `${readFileSync(resolve(SITE_ROOT, path), 'utf8')}\n`;}
  chromeCss += readFileSync(resolve(SITE_ROOT, 'app/components/content/DerivationRelations.vue'), 'utf8');
  const mainCss = readFileSync(resolve(SITE_ROOT, 'app/assets/css/main.css'), 'utf8');
  const tokenDefinitions = `${mainCss}\n${DefaultThemeCss.generate()}`;
  const definedTokens = SiteDesignSystemCssHarness.collectTokens(tokenDefinitions, TestPatterns.CSS_TOKEN_DEFINITION);
  const referencedTokens = SiteDesignSystemCssHarness.collectTokens(chromeCss, TestPatterns.CSS_TOKEN_REFERENCE);
  const undefinedTokens: string[] = [];
  for (const token of referencedTokens) {
    if (!definedTokens.has(token)) {undefinedTokens.push(token);}
  }

  assert.doesNotMatch(chromeCss, TestPatterns.CSS_EXTERNAL_TOKEN);
  assert.doesNotMatch(chromeCss, TestPatterns.CSS_HARDCODED_BORDER_STYLE);
  assert.doesNotMatch(chromeCss, TestPatterns.CSS_HARDCODED_RADIUS);
  assert.doesNotMatch(chromeCss, TestPatterns.CSS_LITERAL_COLOR);
  assert.doesNotMatch(chromeCss, TestPatterns.CSS_TOKEN_FALLBACK);
  assert.doesNotMatch(mainCss, TestPatterns.CSS_TOKEN_FALLBACK);
  assert.deepEqual(undefinedTokens, []);
});

await test('each modal shell disables its entrance animation for reduced motion', () => {
  for (const path of CHROME_STYLESHEETS) {
    if (!path.endsWith('ModalShell.css')) {continue;}
    const css = readFileSync(resolve(SITE_ROOT, path), 'utf8');
    assert.match(css, TestPatterns.CSS_MODAL_REDUCED_MOTION);
  }
});
