import type { ColorRecordEntity, PaletteStateInterface, PipelineContextInterface, TaskInterface } from '@studnicky/iridis';

import { FramingSurface, TaskManifestEntity } from '@studnicky/iridis';
import { LOG_STATUS, LogBody } from '@studnicky/logger/node';
import { JsonObject } from '@studnicky/types/node';

import { FONT_STYLES } from '../data/fontStyles.ts';
import { MODIFIER_TRANSFORMS } from '../data/modifierTransforms.ts';
import { VscodeTokenData } from '../data/VscodeTokenData.ts';
import { SemanticRuleEntryEntity } from '../entities/SemanticRuleEntryEntity.ts';

class SemanticRole {
  static foreground(
    roles: Readonly<Record<string, ColorRecordEntity.Type>>,
    tokenType: string
  ): string {
    const family = VscodeTokenData.TOKEN_FAMILY[tokenType];
    const record = family === undefined ? undefined : roles[family];
    if (record === undefined) {
      throw new RangeError(`VS Code semantic token '${tokenType}' has no resolved family role.`);
    }
    return record.hex;
  }
}

class EmitVscodeSemanticRules implements TaskInterface {
  readonly 'name' = 'emit:vscodeSemanticRules';

  readonly 'manifest' = TaskManifestEntity.create({
    'description': 'Emits semantic token rules directly from resolved role-family colours and declared font styles.',
    'name':        'emit:vscodeSemanticRules',
    'reads':       ['roles', 'runtime.framing'],
    'requires':    ['derive:roleRelations'],
    'writes':      ['outputs.vscode:semanticTokenRules']
  });

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const roles = FramingSurface.resolve(state);
    const rules = new Map<string, SemanticRuleEntryEntity.Type>();
    for (let tokenIndex = 0; tokenIndex < VscodeTokenData.TOKEN_TYPES.length; tokenIndex += 1) {
      const tokenType = VscodeTokenData.TOKEN_TYPES[tokenIndex];
      if (tokenType === undefined) { continue; }
      const foreground = SemanticRole.foreground(roles, tokenType);
      const fontStyle = FONT_STYLES[tokenType];
      rules.set(tokenType, SemanticRuleEntryEntity.create({
        ...(fontStyle === undefined ? {} : { 'fontStyle': fontStyle }),
        'foreground': foreground
      }));
      for (let modifierIndex = 0; modifierIndex < VscodeTokenData.TOKEN_MODIFIERS.length; modifierIndex += 1) {
        const modifier = VscodeTokenData.TOKEN_MODIFIERS[modifierIndex];
        if (modifier === undefined) { continue; }
        const modifierStyle = MODIFIER_TRANSFORMS[modifier]?.fontStyle;
        rules.set(`${tokenType}.${modifier}`, SemanticRuleEntryEntity.create({
          ...(modifierStyle === undefined ? {} : { 'fontStyle': modifierStyle }),
          'foreground': foreground
        }));
      }
    }
    state.outputs['vscode:semanticTokenRules'] = JsonObject.fromEntries(rules);
    context.logger.debug(
      LogBody.create({
        'component': 'EmitVscodeSemanticRules',
        'context': { 'count': rules.size },
        'message': 'Emitted semantic token rules from resolved roles',
        'operation': 'run',
        'status': LOG_STATUS.SUCCESS
      })
    );
  }
}

export const emitVscodeSemanticRules = new EmitVscodeSemanticRules();
