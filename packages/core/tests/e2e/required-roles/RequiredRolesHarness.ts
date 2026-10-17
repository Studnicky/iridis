import type { ColorInputEntity } from '../../../src/entities/ColorInputEntity.ts';
import type { RoleDefinitionInterfaceTypeEntity } from '../../../src/entities/RoleDefinitionInterfaceTypeEntity.ts';
import type { PaletteStateInterface } from '../../../src/interfaces/PaletteStateInterface.ts';

import { Engine } from '../../../src/engine/Engine.ts';
import { InputInterfaceTypeEntity } from '../../../src/entities/InputInterfaceTypeEntity.ts';
import { RoleSchemaInterfaceTypeEntity } from '../../../src/entities/RoleSchemaInterfaceTypeEntity.ts';
import { coreTasks } from '../../../src/tasks/index.ts';
import { REQUIRED_ROLES_PATTERNS } from './constants/RequiredRolesPatterns.ts';

/** Builds isolated engines and role-schema runs for required-role behavior tests. */
export class RequiredRolesHarness {
  static readonly 'hexPattern' = REQUIRED_ROLES_PATTERNS.hex;

  static runAny(
    colors: readonly ColorInputEntity.Type[],
    role: RoleDefinitionInterfaceTypeEntity.Type
  ): PaletteStateInterface {
    const result = RequiredRolesHarness.run(colors, role, ['intake:any', 'resolve:roles']);
    return result;
  }

  static runHex(
    colors: string[],
    role: RoleDefinitionInterfaceTypeEntity.Type
  ): PaletteStateInterface {
    const result = RequiredRolesHarness.run(colors, role, ['intake:hex', 'resolve:roles']);
    return result;
  }

  private static run(
    colors: readonly ColorInputEntity.Type[],
    role: RoleDefinitionInterfaceTypeEntity.Type,
    tasks: readonly string[]
  ): PaletteStateInterface {
    const engine = new Engine();
    for (let taskIndex = 0; taskIndex < coreTasks.length; taskIndex += 1) {
      const task = coreTasks[taskIndex];
      if (task !== undefined) {
        engine.tasks.register(task);
      }
    }
    const schema = RoleSchemaInterfaceTypeEntity.intake({ 'name': 'required-roles', 'roles': [role] });
    engine.pipeline(tasks);
    const result = engine.run(InputInterfaceTypeEntity.intake({ 'colors': [...colors], 'roles': schema }));
    return result;
  }
}
