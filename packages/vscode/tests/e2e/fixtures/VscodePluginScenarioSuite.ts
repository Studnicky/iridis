import assert from 'node:assert/strict';
import { test } from 'node:test';

import { VSCODE_FULL_ROLE_SCHEMAS, vscodePlugin } from '../../../src/index.ts';
import { VscodePluginFixture } from './VscodePluginFixture.ts';
import { VscodePluginPattern } from './VscodePluginPattern.ts';
import { VscodePluginState } from './VscodePluginState.ts';

await test('VscodePlugin :: registers only canonical seed and projection tasks', () => {
  const names = vscodePlugin.tasks().map((task) => {
    const result = task.name;
    return result;
  });

  assert.deepEqual(names, ['vscode:seedRoles', 'vscode:bridgeRoles', 'emit:vscodeSemanticRules', 'emit:vscodeThemeJson']);
});

await test('VscodePlugin :: full schemas include graph-authored output roles', () => {
  const roleNames = VSCODE_FULL_ROLE_SCHEMAS.dark.roles.map((role) => {
    return role.name;
  });

  assert.ok(roleNames.includes('buttonSecondaryHover'));
});

await test('VscodePlugin :: canonical pipeline emits semantic rules, theme JSON, and alpha-serialized workbench paints', () => {
  const state = VscodePluginFixture.runFull(VscodePluginFixture.seedsSrgb);
  const theme = VscodePluginState.themeJson(state);
  const colors = VscodePluginState.workbenchColors(state);

  assert.notEqual(theme, undefined);
  assert.equal(theme?.semanticHighlighting, true);
  assert.match(colors['editor.background'] ?? '', VscodePluginPattern.hexadecimalColor);
  assert.match(colors['editor.selectionHighlightBackground'] ?? '', VscodePluginPattern.hexadecimalColorWithAlpha);
  assert.match(colors['diffEditor.insertedTextBackground'] ?? '', VscodePluginPattern.hexadecimalColorWithAlpha);
  assert.equal(theme?.colors['button.secondaryHoverBackground'], state.roles.buttonSecondaryHover?.hex);
});

await test('VscodePlugin :: theme projection requires semantic rules', () => {
  const engine = VscodePluginFixture.engine();
  assert.throws(() => {
    engine.pipeline(['intake:hex', 'resolve:roles', 'derive:roleRelations', 'emit:vscodeThemeJson']);
  }, VscodePluginPattern.themeRequiresSemanticRules);
});
