import { vscodePlugin } from '@studnicky/iridis-vscode';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import './fixtures/VscodePluginScenarioSuite.ts';

await test('VscodePlugin :: scenario-suite registration exposes the canonical plugin', () => {
  assert.strictEqual(vscodePlugin.name, 'vscode');
});

await test('VscodePlugin :: projects resolved graph roles without private colour-math tasks', () => {
  const taskNames = vscodePlugin.tasks().map((task) => { return task.name; });

  assert.deepStrictEqual(taskNames, ['vscode:seedRoles', 'vscode:bridgeRoles', 'emit:vscodeSemanticRules', 'emit:vscodeThemeJson']);
});
