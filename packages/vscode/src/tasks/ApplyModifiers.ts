import type {
  ColorRecordInterfaceType,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterfaceType
} from '@studnicky/iridis';

import {
  colorRecordFactory,
  darken,
  desaturate,
  ensureContrast,
  lighten,
  mixHsl,
  saturate
} from '@studnicky/iridis';
import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import type { SemanticRuleEntryInterfaceType } from '../types/augmentation.ts';

import { MODIFIER_TRANSFORMS } from '../data/modifierTransforms.ts';
import { VscodeTokenData } from '../data/VscodeTokenData.ts';
import { recordToVscodeColor } from '../util/recordToVscodeColor.ts';

class ApplyModifiers implements TaskInterface {
  readonly 'name' = 'vscode:applyModifiers';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Produces base + per-modifier semantic token rules from MODIFIER_TRANSFORMS, ensuring each rule meets contrast against the background role.',
    'name':        'vscode:applyModifiers',
    'phase':       undefined,
    'reads':       ['metadata.vscode:baseTokens', 'roles'],
    'requires':    ['vscode:expandTokens'],
    'writes':      ['metadata.vscode:semanticTokenRules']
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const baseTokens = (state.metadata['vscode:baseTokens'] ?? {}) as Record<string, ColorRecordInterfaceType>;

    const bgRecord  = state.roles.background ?? colorRecordFactory.fromHex('#000000');
    const rules: Record<string, SemanticRuleEntryInterfaceType> = {};

    const typesLen = VscodeTokenData.TOKEN_TYPES.length;

    // 23 base rules: emit P3 form when the record carries it, hex otherwise.
    for (let i = 0; i < typesLen; i++) {
      const tokenType = VscodeTokenData.TOKEN_TYPES[i];
      if (tokenType === undefined) {continue;}
      const baseRecord = baseTokens[tokenType];
      if (baseRecord === undefined) {continue;}
      rules[tokenType] = { 'fontStyle': undefined, 'foreground': recordToVscodeColor(baseRecord) };
    }

    // 23 token types × N modifiers from TOKEN_MODIFIERS (the VS Code spec set).
    const modifiersLen = VscodeTokenData.TOKEN_MODIFIERS.length;

    for (let i = 0; i < typesLen; i++) {
      const tokenType = VscodeTokenData.TOKEN_TYPES[i];
      if (tokenType === undefined) {continue;}
      const baseRecord = baseTokens[tokenType];
      if (baseRecord === undefined) {continue;}

      for (let j = 0; j < modifiersLen; j++) {
        const modifier = VscodeTokenData.TOKEN_MODIFIERS[j];
        if (modifier === undefined) {continue;}

        const transform = MODIFIER_TRANSFORMS[modifier];
        if (transform === undefined) {continue;}

        let color: ColorRecordInterfaceType = baseRecord;

        if (transform.lightness !== undefined && transform.lightness !== 0) {
          if (transform.lightness > 0) {
            color = lighten.apply(color, transform.lightness);
          } else {
            color = darken.apply(color, -transform.lightness);
          }
        }

        if (transform.saturation !== undefined && transform.saturation !== 0) {
          if (transform.saturation > 0) {
            color = saturate.apply(color, transform.saturation);
          } else {
            color = desaturate.apply(color, -transform.saturation);
          }
        }

        if (transform.mixWith !== undefined && transform.mixWeight !== undefined && transform.mixWeight !== 0) {
          const mixRecord = state.roles[transform.mixWith];
          if (mixRecord !== undefined) {
            color = mixHsl.apply(color, mixRecord, transform.mixWeight);
          }
        }

        color = ensureContrast.apply(color, bgRecord, 4.5);

        const selector = `${tokenType}.${modifier}`;
        rules[selector] = { 'fontStyle': transform.fontStyle, 'foreground': recordToVscodeColor(color) };
      }
    }

    state.metadata['vscode:semanticTokenRules'] = rules;
    ctx.logger.debug(
      LogBody.create()
        .component('ApplyModifiers')
        .operation('run')
        .status(LOG_STATUS.SUCCESS)
        .message('Generated semantic token rules')
        .context({ 'count': Object.keys(rules).length })
        .build()
    );
  }
}

export const applyModifiers = new ApplyModifiers();
