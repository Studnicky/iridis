import type { ColorRecordInterfaceTypeEntity, PaletteStateInterface, PipelineContextInterface, TaskInterface } from '@studnicky/iridis';

import { ModuleError } from '@studnicky/errors/node';
import {
  darken,
  desaturate,
  ensureContrast,
  FramingSurface,
  hueShift,
  lighten,
  mixHsl,
  saturate,
  TaskManifestInterfaceTypeEntity
} from '@studnicky/iridis';
import { LOG_STATUS, LogBody } from '@studnicky/logger/node';
import { JsonObject } from '@studnicky/types/node';

import { VscodeTokenData } from '../data/VscodeTokenData.ts';
import { DerivationParametersInterfaceTypeEntity } from '../entities/DerivationParametersInterfaceTypeEntity.ts';

class TokenDerivation {
  static readonly #familyByToken = new Map(Object.entries(VscodeTokenData.TOKEN_FAMILY));
  static readonly #parametersByToken = new Map(Object.entries(VscodeTokenData.DERIVATION_PARAMETERS));

  static apply(color: ColorRecordInterfaceTypeEntity.Type, parameters: DerivationParametersInterfaceTypeEntity.Type): ColorRecordInterfaceTypeEntity.Type {
    const hueShifted = parameters.hue === undefined || parameters.hue === 0 ? color : hueShift.apply(color, parameters.hue);
    const saturationAdjusted = TokenDerivation.#saturation(hueShifted, parameters.sat);
    const result = TokenDerivation.#lightness(saturationAdjusted, parameters.light);
    return result;
  }

  static family(tokenType: string): string | undefined {
    const result = TokenDerivation.#familyByToken.get(tokenType);
    return result;
  }

  static parameters(tokenType: string): DerivationParametersInterfaceTypeEntity.Type {
    const result = TokenDerivation.#parametersByToken.get(tokenType) ?? DerivationParametersInterfaceTypeEntity.create({});
    return result;
  }

  static requiredRoles(roles: ReadonlyMap<string, ColorRecordInterfaceTypeEntity.Type>): {
    readonly 'background': ColorRecordInterfaceTypeEntity.Type;
    readonly 'foreground': ColorRecordInterfaceTypeEntity.Type;
    readonly 'muted': ColorRecordInterfaceTypeEntity.Type;
  } {
    const background = roles.get('background');
    const muted = roles.get('muted');
    const foreground = roles.get('foreground');
    if (background === undefined || muted === undefined || foreground === undefined) {
      const missingRoles: string[] = [];
      if (background === undefined) { missingRoles.push('background'); }
      if (muted === undefined) { missingRoles.push('muted'); }
      if (foreground === undefined) { missingRoles.push('foreground'); }
      throw ModuleError.create('ExpandTokens: requires roles background, muted, foreground', {
        'context':  { 'missingRoles': missingRoles, 'task': 'ExpandTokens' },
        'scenario': 'NOT_FOUND'
      });
    }
    const result = { 'background': background, 'foreground': foreground, 'muted': muted };
    return result;
  }

  static #lightness(color: ColorRecordInterfaceTypeEntity.Type, lightness: number | undefined): ColorRecordInterfaceTypeEntity.Type {
    if (lightness === undefined || lightness === 0) {
      return color;
    }
    const magnitude = Math.abs(lightness) / 100;
    const result = lightness > 0 ? lighten.apply(color, magnitude) : darken.apply(color, magnitude);
    return result;
  }

  static #saturation(color: ColorRecordInterfaceTypeEntity.Type, saturation: number | undefined): ColorRecordInterfaceTypeEntity.Type {
    if (saturation === undefined || saturation === 0) {
      return color;
    }
    const magnitude = Math.abs(saturation) / 100;
    const result = saturation > 0 ? saturate.apply(color, magnitude) : desaturate.apply(color, magnitude);
    return result;
  }
}

class ExpandTokens implements TaskInterface {
  readonly 'name' = 'vscode:expandTokens';

  readonly 'manifest' = TaskManifestInterfaceTypeEntity.create({
    'description': 'Derives 27 VS Code base token colours from the 16 palette roles using derivation parameters.',
    'name':        'vscode:expandTokens',
    'reads':       ['roles', 'runtime.framing', 'variants'],
    'writes':      ['metadata.vscode:baseTokens']
  });

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const roleRecords = new Map(Object.entries(FramingSurface.resolve(state)));
    const requiredRoles = TokenDerivation.requiredRoles(roleRecords);
    const baseTokens = new Map<string, ColorRecordInterfaceTypeEntity.Type>();
    const tokenTypes = VscodeTokenData.TOKEN_TYPES;
    for (let index = 0; index < tokenTypes.length; index += 1) {
      const tokenType = tokenTypes.at(index);
      if (tokenType === undefined) {
        continue;
      }
      const familyRole = TokenDerivation.family(tokenType);
      if (familyRole === undefined) {
        ExpandTokens.warn(context, 'No family role for token type', { 'tokenType': tokenType });
        continue;
      }
      if (tokenType === 'operator') {
        const mixed = mixHsl.apply(requiredRoles.muted, requiredRoles.foreground, 0.4);
        baseTokens.set(tokenType, ensureContrast.apply(mixed, requiredRoles.background, 3.5));
        continue;
      }
      const familyRecord = roleRecords.get(familyRole);
      if (familyRecord === undefined) {
        ExpandTokens.warn(context, 'No role record for family', { 'familyRole': familyRole, 'tokenType': tokenType });
        continue;
      }
      const derived = TokenDerivation.apply(familyRecord, TokenDerivation.parameters(tokenType));
      const minimumContrast = tokenType === 'comment' ? 3.0 : 4.5;
      baseTokens.set(tokenType, ensureContrast.apply(derived, requiredRoles.background, minimumContrast));
    }
    state.metadata['vscode:baseTokens'] = JsonObject.fromEntries(baseTokens);
    context.logger.debug(
      LogBody.create({
        'component': 'ExpandTokens',
        'context': { 'count': baseTokens.size },
        'message': 'Derived base token colours',
        'operation': 'run',
        'status': LOG_STATUS.SUCCESS
      })
    );
  }

  static warn(context: PipelineContextInterface, message: string, details: Record<string, string>): void {
    context.logger.warn(
      LogBody.create({
        'component': 'ExpandTokens',
        'context': details,
        'message': message,
        'operation': 'run',
        'status': LOG_STATUS.NOT_FOUND
      })
    );
  }
}

export const expandTokens = new ExpandTokens();
