import type { NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** VS Code workbench properties whose colour serialization includes an alpha byte. */
export namespace VscodeWorkbenchPropertyEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/vscode/workbench-alpha-property',
    'enum': [
      'diffEditor.insertedLineBackground',
      'diffEditor.insertedTextBackground',
      'diffEditor.removedLineBackground',
      'diffEditor.removedTextBackground',
      'editor.findMatchBackground',
      'editor.findMatchHighlightBackground',
      'editor.selectionHighlightBackground',
      'editorBracketMatch.background',
      'editorBracketMatch.border',
      'focusBorder',
      'inputOption.activeBackground',
      'scrollbarSlider.activeBackground',
      'scrollbarSlider.background',
      'scrollbarSlider.hoverBackground'
    ],
    'type': 'string'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
}
