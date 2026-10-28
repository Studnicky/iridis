import type { ColorRecordEntity } from '@studnicky/iridis';

import { VscodeAlphaByteEntity } from '../entities/VscodeAlphaByteEntity.ts';
import { VscodeWorkbenchPropertyEntity } from '../entities/VscodeWorkbenchPropertyEntity.ts';

class VscodeWorkbenchAlphaProjection {
  readonly 'bytes': ReadonlyMap<VscodeWorkbenchPropertyEntity.Type, VscodeAlphaByteEntity.Type> = new Map([
    [VscodeWorkbenchPropertyEntity.intake('diffEditor.insertedLineBackground'), VscodeAlphaByteEntity.intake('20')],
    [VscodeWorkbenchPropertyEntity.intake('diffEditor.insertedTextBackground'), VscodeAlphaByteEntity.intake('40')],
    [VscodeWorkbenchPropertyEntity.intake('diffEditor.removedLineBackground'), VscodeAlphaByteEntity.intake('20')],
    [VscodeWorkbenchPropertyEntity.intake('diffEditor.removedTextBackground'), VscodeAlphaByteEntity.intake('40')],
    [VscodeWorkbenchPropertyEntity.intake('editor.findMatchBackground'), VscodeAlphaByteEntity.intake('40')],
    [VscodeWorkbenchPropertyEntity.intake('editor.findMatchHighlightBackground'), VscodeAlphaByteEntity.intake('25')],
    [VscodeWorkbenchPropertyEntity.intake('editor.selectionHighlightBackground'), VscodeAlphaByteEntity.intake('80')],
    [VscodeWorkbenchPropertyEntity.intake('editorBracketMatch.background'), VscodeAlphaByteEntity.intake('60')],
    [VscodeWorkbenchPropertyEntity.intake('editorBracketMatch.border'), VscodeAlphaByteEntity.intake('80')],
    [VscodeWorkbenchPropertyEntity.intake('focusBorder'), VscodeAlphaByteEntity.intake('80')],
    [VscodeWorkbenchPropertyEntity.intake('inputOption.activeBackground'), VscodeAlphaByteEntity.intake('30')],
    [VscodeWorkbenchPropertyEntity.intake('scrollbarSlider.activeBackground'), VscodeAlphaByteEntity.intake('70')],
    [VscodeWorkbenchPropertyEntity.intake('scrollbarSlider.background'), VscodeAlphaByteEntity.intake('30')],
    [VscodeWorkbenchPropertyEntity.intake('scrollbarSlider.hoverBackground'), VscodeAlphaByteEntity.intake('50')]
  ]);

  serialize(property: VscodeWorkbenchPropertyEntity.Type, record: ColorRecordEntity.Type): string {
    const alpha = this.bytes.get(property);
    if (alpha === undefined) {
      throw new RangeError(`VS Code workbench property '${property}' has no alpha-byte projection.`);
    }
    if (record.alpha !== 1 || record.hex.length !== 7) {
      throw new RangeError(`VS Code workbench property '${property}' requires an opaque resolved role record.`);
    }
    const result = `${record.hex}${alpha}`;
    return result;
  }
}

/** Projects declared VS Code workbench alpha bytes onto resolved opaque role records. */
export const VSCODE_WORKBENCH_ALPHA = new VscodeWorkbenchAlphaProjection();
