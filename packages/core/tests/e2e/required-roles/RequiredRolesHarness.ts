import type { ColorInputEntity } from '../../../src/entities/ColorInputEntity.ts';
import type { RoleDefinitionEntity } from '../../../src/entities/RoleDefinitionEntity.ts';
import type { PaletteStateInterface } from '../../../src/interfaces/PaletteStateInterface.ts';

import { Engine } from '../../../src/engine/Engine.ts';
import { InputEntity } from '../../../src/entities/InputEntity.ts';
import { RoleSchemaEntity } from '../../../src/entities/RoleSchemaEntity.ts';
import { coreTasks } from '../../../src/tasks/index.ts';
import { REQUIRED_ROLES_PATTERNS } from './constants/RequiredRolesPatterns.ts';

/** Builds isolated engines and role-schema runs for required-role behavior tests. */
export class RequiredRolesHarness {
  static readonly 'hexPattern' = REQUIRED_ROLES_PATTERNS.hex;

  static runAny(
    colors: readonly ColorInputEntity.Type[],
    role: RoleDefinitionEntity.Type
  ): PaletteStateInterface {
    const result = RequiredRolesHarness.run(colors, role, ['intake:any', 'resolve:roles']);
    return result;
  }

  static runHex(
    colors: string[],
    role: RoleDefinitionEntity.Type
  ): PaletteStateInterface {
    const result = RequiredRolesHarness.run(colors, role, ['intake:hex', 'resolve:roles']);
    return result;
  }

  private static run(
    colors: readonly ColorInputEntity.Type[],
    role: RoleDefinitionEntity.Type,
    tasks: readonly string[]
  ): PaletteStateInterface {
    const engine = new Engine();
    for (let taskIndex = 0; taskIndex < coreTasks.length; taskIndex += 1) {
      const task = coreTasks[taskIndex];
      if (task !== undefined) {
        engine.tasks.register(task);
      }
    }
    const schema = RoleSchemaEntity.intake({ 'name': 'required-roles', 'roles': [role] });
    engine.pipeline(tasks);
    const result = engine.run(InputEntity.intake({ 'colors': [...colors], 'roles': schema }));
    return result;
  }
}
