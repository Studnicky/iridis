import { vscodePlugin } from '@studnicky/iridis-vscode';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import './fixtures/VscodePluginScenarioSuite.ts';

await test('VscodePlugin :: scenario-suite registration exposes the canonical plugin', () => {
  assert.strictEqual(vscodePlugin.name, 'vscode');
});
