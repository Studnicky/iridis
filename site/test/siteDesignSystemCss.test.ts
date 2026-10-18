import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

import { DefaultThemeCss } from '../app/theme/DefaultThemeCss.ts';
import { SiteDesignSystemCssSources } from './fixtures/SiteDesignSystemCssSources.ts';
import { TestPatterns } from './fixtures/TestPatterns.ts';

const SITE_ROOT = resolve(import.meta.dirname, '..');

class SiteDesignSystemCssHarness {
  static collectTokens(css: string, pattern: RegExp): Set<string> {
    const tokens = new Set<string>();
    for (const match of css.matchAll(pattern)) {
      const token = match[1];
      if (token !== undefined) {tokens.add(token);}
    }
    return tokens;
  }

  static collectPresetTypefaces(styleSources: readonly (readonly [string, string])[]): Set<string> {
    const typefaces = new Set<string>();
    for (let sourceIndex = 0; sourceIndex < styleSources.length; sourceIndex += 1) {
      const [, sourceCss] = styleSources[sourceIndex]!;
      const lines = sourceCss.split('\n');
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const line = lines[lineIndex]!;
        const propertyEnd = line.indexOf(':');
        const openingQuote = line.indexOf('"');
        const closingQuote = line.indexOf('"', openingQuote + 1);
        if (propertyEnd === -1 || openingQuote === -1 || closingQuote === -1) {continue;}
        const property = line.slice(0, propertyEnd).trim();
        if (property !== '--font-display' && property !== '--font-sans' && property !== '--font-mono') {continue;}
        typefaces.add(line.slice(openingQuote + 1, closingQuote));
      }
    }
    return typefaces;
  }
}

await test('all site CSS and Vue styles consume defined engine color tokens', () => {
  const styleSources = SiteDesignSystemCssSources.collect(resolve(SITE_ROOT, 'app'));
  const mainCss = readFileSync(resolve(SITE_ROOT, 'app/assets/css/main.css'), 'utf8');
  const tokenDefinitions = `${mainCss}\n${DefaultThemeCss.generate()}`;
  const definedTokens = SiteDesignSystemCssHarness.collectTokens(tokenDefinitions, TestPatterns.CSS_TOKEN_DEFINITION);
  const undefinedTokens: string[] = [];

  assert.ok(styleSources.length > 0);
  for (let sourceIndex = 0; sourceIndex < styleSources.length; sourceIndex += 1) {
    const [sourcePath, sourceCss] = styleSources[sourceIndex]!;
    const css = sourceCss.replaceAll(SiteDesignSystemCssSources.CSS_COMMENT, '');
    const referencedTokens = SiteDesignSystemCssHarness.collectTokens(css, TestPatterns.CSS_TOKEN_REFERENCE);
    for (const token of referencedTokens) {
      if (token.startsWith('--ui-') && !definedTokens.has(token)) {
        undefinedTokens.push(`${sourcePath}: ${token}`);
      }
    }
    assert.doesNotMatch(css, TestPatterns.CSS_EXTERNAL_TOKEN, sourcePath);
    assert.doesNotMatch(css, TestPatterns.CSS_LITERAL_COLOR, sourcePath);
    assert.doesNotMatch(css, SiteDesignSystemCssSources.ENGINE_COLOR_TOKEN_FALLBACK, sourcePath);
    assert.doesNotMatch(css, SiteDesignSystemCssSources.RAW_COLOR_MIX_ENDPOINT, sourcePath);
  }

  assert.deepEqual(undefinedTokens, []);
});

await test('Nuxt UI solid buttons rely on the engine contrast token without a fallback', () => {
  const appConfig = readFileSync(resolve(SITE_ROOT, 'app/app.config.ts'), 'utf8');

  assert.match(appConfig, SiteDesignSystemCssSources.PRIMARY_CONTRAST_CLASS);
  assert.doesNotMatch(appConfig, TestPatterns.CSS_TOKEN_FALLBACK);
  assert.doesNotMatch(appConfig, SiteDesignSystemCssSources.FORBIDDEN_APP_CONFIG_COLOR_FALLBACK);
});

await test('each modal shell disables its entrance animation for reduced motion', () => {
  const styleSources = SiteDesignSystemCssSources.collect(resolve(SITE_ROOT, 'app'));
  for (let sourceIndex = 0; sourceIndex < styleSources.length; sourceIndex += 1) {
    const [sourcePath, sourceCss] = styleSources[sourceIndex]!;
    if (!sourcePath.endsWith('ModalShell.css')) {continue;}
    assert.match(sourceCss, TestPatterns.CSS_MODAL_REDUCED_MOTION, sourcePath);
  }
});

await test('every themed typeface is self-hosted', () => {
  const mainCss = readFileSync(resolve(SITE_ROOT, 'app/assets/css/main.css'), 'utf8');
  const fontCss = readFileSync(resolve(SITE_ROOT, 'app/assets/css/fonts.css'), 'utf8');
  const presetSources = SiteDesignSystemCssSources.collect(resolve(SITE_ROOT, 'app/theme/presets'));
  const typefaces = SiteDesignSystemCssHarness.collectPresetTypefaces(presetSources);

  assert.ok(mainCss.includes('@import "./fonts.css";'));
  assert.ok(fontCss.includes('@font-face'));
  assert.ok(!fontCss.includes('http://') && !fontCss.includes('https://'));
  assert.ok(!fontCss.includes('_fonts'));
  typefaces.forEach((typeface) => {
    assert.ok(
      fontCss.includes(`font-family:${typeface};`) || fontCss.includes(`font-family:"${typeface}"`),
      `Missing a local font-face for ${typeface}.`
    );
  });
});
