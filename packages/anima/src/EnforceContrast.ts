import type {
  ColorRecordInterfaceTypeEntity,
  ContrastPairInterfaceTypeEntity,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface
} from '@studnicky/iridis';

import {
  colorRecordFactory,
  consoleLogger,
  InputInterfaceTypeEntity,
  PaletteRoleState,
  RoleSchemaInterfaceTypeEntity,
  RuntimeOptionsInterfaceTypeEntity
} from '@studnicky/iridis';
import { OklchInterfaceTypeEntity, PaletteInterfaceTypeEntity } from '@studnicky/iridis-algebra';
import { enforceWcagAa } from '@studnicky/iridis-contrast';

class AnimationContrastState {
  static build(
    palette: PaletteInterfaceTypeEntity.Type,
    pairs: readonly ContrastPairInterfaceTypeEntity.Type[]
  ): PaletteStateInterface {
    const roleRecords = new Map<string, ColorRecordInterfaceTypeEntity.Type>();
    const roleNames = new Set<string>();
    const paletteEntries = Object.entries(palette);

    for (let index = 0; index < paletteEntries.length; index += 1) {
      const entry = paletteEntries[index];
      if (entry === undefined) {
        continue;
      }
      const [roleName, oklch] = entry;
      roleNames.add(roleName);
      roleRecords.set(roleName, colorRecordFactory.fromOklch(oklch.l, oklch.c, oklch.h));
    }

    for (let index = 0; index < pairs.length; index += 1) {
      const pair = pairs[index];
      if (pair !== undefined) {
        roleNames.add(pair.foreground);
        roleNames.add(pair.background);
      }
    }

    const roleNamesList = Array.from(roleNames);
    const roleDefinitions = new Array<{ 'name': string }>(roleNamesList.length);
    for (let index = 0; index < roleNamesList.length; index += 1) {
      const roleName = roleNamesList[index];
      if (roleName !== undefined) {
        roleDefinitions[index] = { 'name': roleName };
      }
    }

    const roles: Record<string, ColorRecordInterfaceTypeEntity.Type> = {};
    const roleEntries = Array.from(roleRecords);
    for (let index = 0; index < roleEntries.length; index += 1) {
      const entry = roleEntries[index];
      if (entry !== undefined) {
        const [roleName, record] = entry;
        Object.defineProperty(roles, roleName, {
          'configurable': true,
          'enumerable':   true,
          'value':        record,
          'writable':     true
        });
      }
    }
    const contrastPairs = pairs.slice();
    const schema = RoleSchemaInterfaceTypeEntity.create({
      'contrastPairs': contrastPairs,
      'name':          'anima:frame',
      'roles':         roleDefinitions
    });
    const input = InputInterfaceTypeEntity.create({ 'colors': [], 'roles': schema });
    const runtime = RuntimeOptionsInterfaceTypeEntity.create({});
    const result: PaletteStateInterface = {
      'colors':   [],
      'input':    input,
      'metadata': {},
      'outputs':  {},
      'roles':    roles,
      'runtime':  runtime,
      'variants': {}
    };
    return result;
  }
}

class EnforceContrast {
  static apply(
    palette: PaletteInterfaceTypeEntity.Type,
    pairs: readonly ContrastPairInterfaceTypeEntity.Type[],
    enforcer: TaskInterface = enforceWcagAa
  ): PaletteInterfaceTypeEntity.Type {
    if (pairs.length === 0) {
      return palette;
    }

    const state = AnimationContrastState.build(palette, pairs);
    const context: PipelineContextInterface = {
      'logger':    consoleLogger,
      'startedAt': Date.now()
    };
    enforcer.run(state, context);

    const result = new Map<string, PaletteInterfaceTypeEntity.Type[string]>();
    const roleState = PaletteRoleState.admit(state.roles);
    const roleNames = Object.keys(palette);
    for (let index = 0; index < roleNames.length; index += 1) {
      const roleName = roleNames[index];
      if (roleName === undefined) {
        continue;
      }
      const record = roleState.get(roleName);
      if (record !== undefined) {
        result.set(roleName, { 'c': record.oklch.c, 'h': record.oklch.h, 'l': record.oklch.l });
      }
    }
    const enforcedPalette: PaletteInterfaceTypeEntity.Type = {};
    const enforcedEntries = Array.from(result);
    for (let index = 0; index < enforcedEntries.length; index += 1) {
      const entry = enforcedEntries[index];
      if (entry !== undefined) {
        const [roleName, oklch] = entry;
        Object.defineProperty(enforcedPalette, roleName, {
          'configurable': true,
          'enumerable':   true,
          'value':        OklchInterfaceTypeEntity.create(oklch),
          'writable':     true
        });
      }
    }
    const validatedPalette = PaletteInterfaceTypeEntity.create(enforcedPalette);
    return validatedPalette;
  }
}

export const enforceContrast = EnforceContrast.apply;
