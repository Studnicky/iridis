import type { PaletteStateInterface, PipelineContextInterface, TaskInterface } from '@studnicky/iridis';

import { TaskManifestEntity } from '@studnicky/iridis';
import { LOG_STATUS, LogBody } from '@studnicky/logger/node';
import { JsonObject } from '@studnicky/types/node';

import { VSCODE_SCOPE_MAPPINGS } from '../constants/VscodeScopeMappings.ts';
import { FONT_STYLES } from '../data/fontStyles.ts';
import { SemanticRuleEntryEntity } from '../entities/SemanticRuleEntryEntity.ts';
import { VscodeMetadata } from '../VscodeMetadata.ts';

class SemanticRuleStyle {
  static defaultFontStyle(selector: string): string | undefined {
    const baseType = selector.includes('.') ? selector.split('.')[0] : selector;
    const result = baseType === undefined || baseType.length === 0 ? undefined : FONT_STYLES[baseType];
    return result;
  }

  static entry(selector: string, rule: SemanticRuleEntryEntity.Type): SemanticRuleEntryEntity.Type {
    const foreground = typeof rule.foreground === 'string' && rule.foreground.length > 0 ? rule.foreground : undefined;
    const candidateFontStyle = typeof rule.fontStyle === 'string' ? rule.fontStyle : SemanticRuleStyle.defaultFontStyle(selector);
    const fontStyle = candidateFontStyle !== undefined && candidateFontStyle.length > 0 ? candidateFontStyle : undefined;
    const candidate = {
      ...(fontStyle === undefined ? {} : { 'fontStyle': fontStyle }),
      ...(foreground === undefined ? {} : { 'foreground': foreground })
    };
    const result = SemanticRuleEntryEntity.create(candidate);
    return result;
  }
}

class EmitVscodeSemanticRules implements TaskInterface {
  readonly 'name' = 'emit:vscodeSemanticRules';

  readonly 'manifest' = TaskManifestEntity.create({
    'description': 'Shapes the semantic token rule map for VS Code editor.semanticTokenColorCustomizations.rules using SCOPE_MAPPINGS and FONT_STYLES.',
    'name':        'emit:vscodeSemanticRules',
    'reads':       ['metadata.vscode:semanticTokenRules', 'metadata.vscode:baseTokens'],
    'requires':    ['vscode:applyModifiers'],
    'writes':      ['outputs.vscode:semanticTokenRules']
  });

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const semanticRules = VscodeMetadata.semanticTokenRules(state.metadata);
    const emittedRules = new Map<string, SemanticRuleEntryEntity.Type>();
    for (const [selector, rule] of semanticRules) {
      emittedRules.set(selector, SemanticRuleStyle.entry(selector, rule));
    }
    state.outputs['vscode:semanticTokenRules'] = JsonObject.fromEntries(emittedRules);
    context.logger.debug(
      LogBody.create({
        'component': 'EmitVscodeSemanticRules',
        'context': { 'count': emittedRules.size },
        'message': 'Emitted semantic token rules',
        'operation': 'run',
        'status': LOG_STATUS.SUCCESS
      })
    );
    const baseTokens = VscodeMetadata.baseTokens(state.metadata);
    const scopeNames = Object.keys(VSCODE_SCOPE_MAPPINGS.mappings);
    for (let index = 0; index < scopeNames.length; index += 1) {
      const scopeName = scopeNames.at(index);
      if (scopeName !== undefined && !baseTokens.has(scopeName) && !emittedRules.has(scopeName)) {
        context.logger.debug(
          LogBody.create({
            'component': 'EmitVscodeSemanticRules',
            'context': { 'scope': scopeName },
            'message': 'No colour assigned for scope group',
            'operation': 'run',
            'status': LOG_STATUS.SKIPPED
          })
        );
      }
    }
  }
}

export const emitVscodeSemanticRules = new EmitVscodeSemanticRules();
