import type { ColorRecordEntity, PaletteStateInterface, PipelineContextInterface, TaskInterface } from '@studnicky/iridis';

import {
  colorRecordFactory,
  darken,
  desaturate,
  ensureContrast,
  FramingSurface,
  lighten,
  mixHsl,
  saturate,
  TaskManifestEntity
} from '@studnicky/iridis';
import { LOG_STATUS, LogBody } from '@studnicky/logger/node';
import { JsonObject } from '@studnicky/types/node';

import type { SemanticRuleEntryEntity } from '../entities/SemanticRuleEntryEntity.ts';

import { MODIFIER_TRANSFORMS } from '../data/modifierTransforms.ts';
import { VscodeTokenData } from '../data/VscodeTokenData.ts';
import { VscodeMetadata } from '../VscodeMetadata.ts';

class ApplyModifiers implements TaskInterface {
  readonly 'name' = 'vscode:applyModifiers';

  readonly 'manifest' = TaskManifestEntity.create({
    'description': 'Produces base + per-modifier semantic token rules from MODIFIER_TRANSFORMS, ensuring each rule meets contrast against the background role.',
    'name':        'vscode:applyModifiers',
    'reads':       ['metadata.vscode:baseTokens', 'roles', 'runtime.framing', 'variants'],
    'requires':    ['vscode:expandTokens'],
    'writes':      ['metadata.vscode:semanticTokenRules']
  });

  static #applyLightness(color: ColorRecordEntity.Type, lightness: number | undefined): ColorRecordEntity.Type {
    if (lightness === undefined || lightness === 0) {
      return color;
    }
    const result = lightness > 0 ? lighten.apply(color, lightness) : darken.apply(color, -lightness);
    return result;
  }

  static #applySaturation(color: ColorRecordEntity.Type, saturation: number | undefined): ColorRecordEntity.Type {
    if (saturation === undefined || saturation === 0) {
      return color;
    }
    const result = saturation > 0 ? saturate.apply(color, saturation) : desaturate.apply(color, -saturation);
    return result;
  }

  static #applyMix(
    color: ColorRecordEntity.Type,
    transform: typeof MODIFIER_TRANSFORMS[string],
    roles: ReadonlyMap<string, ColorRecordEntity.Type>
  ): ColorRecordEntity.Type {
    if (transform.mixWith === undefined || transform.mixWeight === undefined || transform.mixWeight === 0) {
      return color;
    }
    const mixRecord = roles.get(transform.mixWith);
    if (mixRecord === undefined) {
      return color;
    }
    const result = mixHsl.apply(color, mixRecord, transform.mixWeight);
    return result;
  }

  static #writeBaseRules(
    baseTokens: ReadonlyMap<string, ColorRecordEntity.Type>,
    rules: Map<string, SemanticRuleEntryEntity.Type>
  ): void {
    for (let typeIndex = 0; typeIndex < VscodeTokenData.TOKEN_TYPES.length; typeIndex += 1) {
      const tokenType = VscodeTokenData.TOKEN_TYPES.at(typeIndex);
      if (tokenType === undefined) {
        continue;
      }
      const baseRecord = baseTokens.get(tokenType);
      if (baseRecord !== undefined) {
        rules.set(tokenType, { 'foreground': baseRecord.hex });
      }
    }
  }

  static #writeTokenModifierRules(
    tokenType: string,
    baseRecord: ColorRecordEntity.Type,
    transforms: ReadonlyMap<string, typeof MODIFIER_TRANSFORMS[string]>,
    roles: ReadonlyMap<string, ColorRecordEntity.Type>,
    background: ColorRecordEntity.Type,
    rules: Map<string, SemanticRuleEntryEntity.Type>
  ): void {
    for (let modifierIndex = 0; modifierIndex < VscodeTokenData.TOKEN_MODIFIERS.length; modifierIndex += 1) {
      const modifier = VscodeTokenData.TOKEN_MODIFIERS.at(modifierIndex);
      const transform = modifier === undefined ? undefined : transforms.get(modifier);
      if (modifier === undefined || transform === undefined) {
        continue;
      }
      const lightened = ApplyModifiers.#applyLightness(baseRecord, transform.lightness);
      const saturated = ApplyModifiers.#applySaturation(lightened, transform.saturation);
      const mixed = ApplyModifiers.#applyMix(saturated, transform, roles);
      const color = ensureContrast.apply(mixed, background, 4.5);
      const rule = transform.fontStyle === undefined
        ? { 'foreground': color.hex }
        : { 'fontStyle': transform.fontStyle, 'foreground': color.hex };
      rules.set(`${tokenType}.${modifier}`, rule);
    }
  }

  static #writeModifierRules(
    baseTokens: ReadonlyMap<string, ColorRecordEntity.Type>,
    roles: ReadonlyMap<string, ColorRecordEntity.Type>,
    background: ColorRecordEntity.Type,
    rules: Map<string, SemanticRuleEntryEntity.Type>
  ): void {
    const transforms = new Map(Object.entries(MODIFIER_TRANSFORMS));
    for (let typeIndex = 0; typeIndex < VscodeTokenData.TOKEN_TYPES.length; typeIndex += 1) {
      const tokenType = VscodeTokenData.TOKEN_TYPES.at(typeIndex);
      const baseRecord = tokenType === undefined ? undefined : baseTokens.get(tokenType);
      if (tokenType !== undefined && baseRecord !== undefined) {
        ApplyModifiers.#writeTokenModifierRules(tokenType, baseRecord, transforms, roles, background, rules);
      }
    }
  }

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const baseTokens = VscodeMetadata.baseTokens(state.metadata);
    const roles = new Map<string, ColorRecordEntity.Type>(Object.entries(FramingSurface.resolve(state)));
    const background = roles.get('background') ?? colorRecordFactory.fromHex('#000000');
    const rules = new Map<string, SemanticRuleEntryEntity.Type>();
    ApplyModifiers.#writeBaseRules(baseTokens, rules);
    ApplyModifiers.#writeModifierRules(baseTokens, roles, background, rules);
    state.metadata['vscode:semanticTokenRules'] = JsonObject.fromEntries(rules);
    context.logger.debug(
      LogBody.create({
        'component': 'ApplyModifiers',
        'context': { 'count': rules.size },
        'message': 'Generated semantic token rules',
        'operation': 'run',
        'status': LOG_STATUS.SUCCESS
      })
    );
  }
}

export const applyModifiers = new ApplyModifiers();
