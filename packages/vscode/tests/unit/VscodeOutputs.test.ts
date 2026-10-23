import assert from 'node:assert/strict';
import { test } from 'node:test';

import { VscodeOutputs } from '../../src/index.ts';

await test('VscodeOutputs :: workbenchColors reads the emitted slot through the public export', () => {
  const colors = VscodeOutputs.workbenchColors({
    'vscode:workbenchColors': {
      'statusBar.noFolderBackground': '#101820',
      'statusBar.noFolderForeground': '#e8eef4'
    }
  });

  assert.equal(colors.get('statusBar.noFolderBackground'), '#101820');
  assert.equal(colors.get('statusBar.noFolderForeground'), '#e8eef4');
  assert.equal(colors.size, 2);
});

await test('VscodeOutputs :: workbenchColors returns an empty map when the slot is absent', () => {
  assert.equal(VscodeOutputs.workbenchColors({}).size, 0);
});
