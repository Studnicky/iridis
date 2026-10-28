import { colorRecordFactory } from '@studnicky/iridis/math';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { VSCODE_WORKBENCH_ALPHA } from '../../src/constants/VscodeWorkbenchAlpha.ts';
import { VscodeWorkbenchPropertyEntity } from '../../src/entities/VscodeWorkbenchPropertyEntity.ts';

const expectedAlpha = new Map([
  ['diffEditor.insertedLineBackground', '20'],
  ['diffEditor.insertedTextBackground', '40'],
  ['diffEditor.removedLineBackground', '20'],
  ['diffEditor.removedTextBackground', '40'],
  ['editor.findMatchBackground', '40'],
  ['editor.findMatchHighlightBackground', '25'],
  ['editor.selectionHighlightBackground', '80'],
  ['editorBracketMatch.background', '60'],
  ['editorBracketMatch.border', '80'],
  ['focusBorder', '80'],
  ['inputOption.activeBackground', '30'],
  ['scrollbarSlider.activeBackground', '70'],
  ['scrollbarSlider.background', '30'],
  ['scrollbarSlider.hoverBackground', '50']
]);

await test('VscodeWorkbenchAlpha :: maps every transparent workbench property to its alpha byte and serialized colour', () => {
  const record = colorRecordFactory.fromHex('#123456');

  assert.equal(VSCODE_WORKBENCH_ALPHA.bytes.size, expectedAlpha.size);
  for (const [property, alpha] of expectedAlpha) {
    const admittedProperty = VscodeWorkbenchPropertyEntity.intake(property);
    assert.equal(VSCODE_WORKBENCH_ALPHA.bytes.get(admittedProperty), alpha, property);
    assert.equal(VSCODE_WORKBENCH_ALPHA.serialize(admittedProperty, record), `#123456${alpha}`, property);
  }
});
