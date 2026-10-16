
import type {
  InputInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterfaceType
} from '@studnicky/iridis';
import type { JsonValueType } from '@studnicky/types';

import { ValidationError } from '@studnicky/errors';
import { colorRecordFactory } from '@studnicky/iridis';
import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import { VSCODE_SEED_ROLE_CONSTANTS } from '../constants/VscodeSeedRoleConstants.ts';
import { vscodeSeedRoleData } from '../data/vscodeSeedRoleData.ts';

class VscodeSeedPalette {
  static invalid(path: string, message: string): never {
    throw ValidationError.create({
      'message': `vscode:seedRoles — ${message}`,
      'path':    path,
      'violations': [{ 'message': message, 'path': path }]
    });
  }

  static isJsonObject(value: InputInterface['colors'][number] | JsonValueType | undefined): value is Record<string, JsonValueType> {
    return value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value);
  }
}

class SeedVscodeRoles implements TaskInterface {
  readonly 'name' = 'vscode:seedRoles';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Parses exactly one input.colors palette object: { tier: 4|8|16|64, framing: dark|light, roles: { exact tier role keys mapped to #rrggbb } }. input.runtime.framing is required and must equal framing.',
    'name':        'vscode:seedRoles',
    'phase':       undefined,
    'reads':       ['input.colors', 'runtime.framing'],
    'requires':    undefined,
    'writes':      ['colors']
  };

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    if (state.input.colors.length !== 1) {
      VscodeSeedPalette.invalid('input.colors', 'requires exactly one structured palette object');
    }
    const rawPalette = state.input.colors[0];
    if (!VscodeSeedPalette.isJsonObject(rawPalette)) {
      VscodeSeedPalette.invalid('input.colors[0]', 'expected one palette object');
    }

    const paletteKeys = Object.keys(rawPalette);
    if (paletteKeys.length !== 3 || !paletteKeys.every((key) => { return key === 'tier' || key === 'framing' || key === 'roles'; })) {
      VscodeSeedPalette.invalid('input.colors[0]', 'requires exactly tier, framing, and roles keys');
    }

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

    let roleNames: readonly string[] | undefined;
    for (const candidate of vscodeSeedRoleData.roleTiers) {
      if (candidate.tier === tier) {
        roleNames = candidate.roleNames;
        break;
      }
    }
    if (roleNames === undefined) {
      VscodeSeedPalette.invalid('input.colors[0].tier', 'does not identify a supported role tier');
    }
    const roleKeys = Object.keys(roles);
    if (roleKeys.length !== roleNames.length || !roleKeys.every((key) => { const result = roleNames.includes(key);
      return result; })) {
      VscodeSeedPalette.invalid('input.colors[0].roles', `must contain exactly the ${tier}-tier role keys`);
    }

    for (const role of roleNames) {
      const color = roles[role];
      if (typeof color !== 'string' || !VSCODE_SEED_ROLE_CONSTANTS.hexColor.test(color)) {
        VscodeSeedPalette.invalid(`input.colors[0].roles.${role}`, 'must be a #rrggbb color');
      }
      state.colors.push(colorRecordFactory.fromHex(color, {
        'hints': { 'intent': undefined, 'role': role, 'weight': undefined },
        'sourceFormat': 'hex'
      }));
    }

    context.logger.debug(
      LogBody.create()
        .component('SeedVscodeRoles')
        .operation('run')
        .status(LOG_STATUS.SUCCESS)
        .message('Seeded VS Code palette roles')
        .context({ 'framing': framing, 'tier': tier })
        .build()
    );
  }
}

export const seedVscodeRoles = new SeedVscodeRoles();
