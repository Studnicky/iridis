
import type {
  InputInterfaceTypeEntity,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface
} from '@studnicky/iridis';
import type { JSONSchema7Type } from 'json-schema';

import { ValidationError } from '@studnicky/errors/node';
import { colorRecordFactory, TaskManifestInterfaceTypeEntity } from '@studnicky/iridis';
import { LOG_STATUS, LogBody } from '@studnicky/logger/node';

import { VSCODE_SEED_ROLE_CONSTANTS } from '../constants/VscodeSeedRoleConstants.ts';
import { vscodeSeedRoleData } from '../data/vscodeSeedRoleData.ts';

class VscodeSeedPalette {
  static readonly #roleNamesByTier = new Map<number, readonly string[]>(vscodeSeedRoleData.roleTiers.map((candidate) => { return [candidate.tier, candidate.roleNames]; }));
  static invalid(path: string, message: string): never {
    throw ValidationError.create({
      'message': `vscode:seedRoles — ${message}`,
      'path':    path,
      'violations': [{ 'message': message, 'path': path }]
    });
  }

  static isJsonObject(value: InputInterfaceTypeEntity.Type['colors'][number] | JSONSchema7Type | undefined): value is Record<string, JSONSchema7Type> {
    const result = value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value);
    return result;
  }

  static rawPalette(state: PaletteStateInterface): Record<string, JSONSchema7Type> {
    if (state.input.colors.length !== 1) {
      VscodeSeedPalette.invalid('input.colors', 'requires exactly one structured palette object');
    }
    const rawPalette = state.input.colors[0];
    if (!VscodeSeedPalette.isJsonObject(rawPalette)) {
      VscodeSeedPalette.invalid('input.colors[0]', 'expected one palette object');
    }
    const paletteKeys = Object.keys(rawPalette);
    const paletteKeysValid = paletteKeys.every((key) => {
      const result = key === 'tier' || key === 'framing' || key === 'roles';
      return result;
    });
    if (paletteKeys.length !== 3 || !paletteKeysValid) {
      VscodeSeedPalette.invalid('input.colors[0]', 'requires exactly tier, framing, and roles keys');
    }
    return rawPalette;
  }

  static values(
    rawPalette: Record<string, JSONSchema7Type>,
    state: PaletteStateInterface
  ): { readonly 'framing': string; readonly 'roles': Record<string, JSONSchema7Type>; readonly 'tier': number } {
    const tier = rawPalette.tier;
    if (tier !== 4 && tier !== 8 && tier !== 16 && tier !== 64) {
      VscodeSeedPalette.invalid('input.colors[0].tier', 'must be the numeric literal 4, 8, 16, or 64');
    }
    const framing = rawPalette.framing;
    if (framing !== 'dark' && framing !== 'light') {
      VscodeSeedPalette.invalid('input.colors[0].framing', 'must be dark or light');
    }
    const roles = rawPalette.roles;
    if (!VscodeSeedPalette.isJsonObject(roles)) {
      VscodeSeedPalette.invalid('input.colors[0].roles', 'must be an object of #rrggbb role colors');
    }
    if (state.runtime.framing === undefined) {
      VscodeSeedPalette.invalid('input.runtime.framing', 'is required and must equal the palette framing');
    }
    if (state.runtime.framing !== framing) {
      VscodeSeedPalette.invalid('input.runtime.framing', 'must equal input.colors[0].framing');
    }
    const result = { 'framing': framing, 'roles': roles, 'tier': tier };
    return result;
  }

  static roleNames(tier: number): readonly string[] {
    const roleNames = VscodeSeedPalette.#roleNamesByTier.get(tier);
    if (roleNames === undefined) {
      VscodeSeedPalette.invalid('input.colors[0].tier', 'does not identify a supported role tier');
    }
    return roleNames;
  }

  static validateRoleKeys(roles: Record<string, JSONSchema7Type>, roleNames: readonly string[], tier: number): void {
    const roleKeys = Object.keys(roles);
    const roleNameSet = new Set(roleNames);
    const roleKeysValid = roleKeys.every((key) => {
      const result = roleNameSet.has(key);
      return result;
    });
    if (roleKeys.length !== roleNames.length || !roleKeysValid) {
      VscodeSeedPalette.invalid('input.colors[0].roles', `must contain exactly the ${tier}-tier role keys`);
    }
  }
}

class SeedVscodeRoles implements TaskInterface {
  readonly 'name' = 'vscode:seedRoles';

  readonly 'manifest' = TaskManifestInterfaceTypeEntity.create({
    'description': 'Parses exactly one input.colors palette object: { tier: 4|8|16|64, framing: dark|light, roles: { exact tier role keys mapped to #rrggbb } }. input.runtime.framing is required and must equal framing.',
    'name':        'vscode:seedRoles',
    'reads':       ['input.colors', 'runtime.framing'],
    'writes':      ['colors']
  });

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const rawPalette = VscodeSeedPalette.rawPalette(state);
    const palette = VscodeSeedPalette.values(rawPalette, state);
    const roleNames = VscodeSeedPalette.roleNames(palette.tier);
    VscodeSeedPalette.validateRoleKeys(palette.roles, roleNames, palette.tier);
    for (let roleIndex = 0; roleIndex < roleNames.length; roleIndex += 1) {
      const role = roleNames.at(roleIndex);
      if (role === undefined) {
        continue;
      }
      const color = palette.roles[role];
      if (typeof color !== 'string' || !VSCODE_SEED_ROLE_CONSTANTS.hexColor.test(color)) {
        VscodeSeedPalette.invalid(`input.colors[0].roles.${role}`, 'must be a #rrggbb color');
      }
      state.colors.push(colorRecordFactory.fromHex(color, {
        'hints': { 'role': role },
        'sourceFormat': 'hex'
      }));
    }
    context.logger.debug(
      LogBody.create({
        'component': 'SeedVscodeRoles',
        'context': { 'framing': palette.framing, 'tier': palette.tier },
        'message': 'Seeded VS Code palette roles',
        'operation': 'run',
        'status': LOG_STATUS.SUCCESS
      })
    );
  }
}

export const seedVscodeRoles = new SeedVscodeRoles();
