import type {
  ColorRecordInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '@studnicky/iridis';
import {
  colorRecordFactory,
  darken,
  desaturate,
  ensureContrast,
  getOrCreateMetadata,
  lighten,
  mixHsl,
  saturate,
} from '@studnicky/iridis';
import type { SemanticRuleEntryInterface } from '../types/augmentation.ts';
import { MODIFIER_TRANSFORMS } from '../data/modifierTransforms.ts';
import { TOKEN_MODIFIERS, TOKEN_TYPES } from '../data/derivationParams.ts';
import { recordToVscodeColor } from '../util/recordToVscodeColor.ts';

export class ApplyModifiers implements TaskInterface {
  readonly 'name' = 'vscode:applyModifiers';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'vscode:applyModifiers',
    'reads':       ['metadata.vscode.baseTokens', 'roles'],
    'writes':      ['metadata.vscode.semanticTokenRules'],
    'requires':    ['vscode:expandTokens'],
    'description': 'Produces base + per-modifier semantic token rules from MODIFIER_TRANSFORMS, ensuring each rule meets contrast against the background role.',
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const meta = getOrCreateMetadata(state, 'vscode');
    const baseTokens = meta['baseTokens'];

    if (!baseTokens) {
      throw new Error('ApplyModifiers: metadata.vscode.baseTokens not found — run vscode:expandTokens first');
    }

    const bgRecord = state.roles['background'] ?? colorRecordFactory.fromHex('#000000');
    const rules: Record<string, SemanticRuleEntryInterface> = {};

    const typesLen = TOKEN_TYPES.length;

    // 23 base rules — emit P3 form when the record carries it, hex otherwise.
    for (let i = 0; i < typesLen; i++) {
      const tokenType = TOKEN_TYPES[i];
      if (!tokenType) continue;
      const baseRecord = baseTokens[tokenType];
      if (!baseRecord) continue;
      rules[tokenType] = { 'foreground': recordToVscodeColor(baseRecord) };
    }

    // 23 token types × N modifiers from TOKEN_MODIFIERS (the VS Code spec set).
    const modifiersLen = TOKEN_MODIFIERS.length;

    for (let i = 0; i < typesLen; i++) {
      const tokenType = TOKEN_TYPES[i];
      if (!tokenType) continue;
      const baseRecord = baseTokens[tokenType];
      if (!baseRecord) continue;

      for (let j = 0; j < modifiersLen; j++) {
        const modifier = TOKEN_MODIFIERS[j];
        if (!modifier) continue;

        const transform = MODIFIER_TRANSFORMS[modifier];
        if (!transform) continue;

        let color: ColorRecordInterface = baseRecord;

        if (transform.lightness) {
          if (transform.lightness > 0) {
            color = lighten.apply(color, transform.lightness);
          } else {
            color = darken.apply(color, -transform.lightness);
          }
        }

        if (transform.saturation) {
          if (transform.saturation > 0) {
            color = saturate.apply(color, transform.saturation);
          } else {
            color = desaturate.apply(color, -transform.saturation);
          }
        }

        if (transform.mixWith && transform.mixWeight) {
          const mixRecord = state.roles[transform.mixWith];
          if (mixRecord) {
            color = mixHsl.apply(color, mixRecord, transform.mixWeight);
          }
        }

        color = ensureContrast.apply(color, bgRecord, 4.5);

        const selector = `${tokenType}.${modifier}`;
        const entry: SemanticRuleEntryInterface = { 'foreground': recordToVscodeColor(color) };
        if (transform.fontStyle) {
          entry['fontStyle'] = transform.fontStyle;
        }
        rules[selector] = entry;
      }
    }

    meta['semanticTokenRules'] = rules;
    ctx.logger.debug('ApplyModifiers', 'run', 'Generated semantic token rules', {
      'count': Object.keys(rules).length,
    });
  }
}

export const applyModifiers = new ApplyModifiers();
