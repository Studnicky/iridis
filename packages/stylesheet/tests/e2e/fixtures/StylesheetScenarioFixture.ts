import { InputInterfaceTypeEntity, type RoleSchemaInterfaceTypeEntity } from '@studnicky/iridis';
import { Engine } from '@studnicky/iridis/engine';
import { coreTasks } from '@studnicky/iridis/tasks';

import { stylesheetPlugin } from '../../../src/index.ts';

export class StylesheetScenarioFixture {
  static engine(): Engine { const engine = new Engine(); for (let index = 0; index < coreTasks.length; index += 1) { const task = coreTasks[index]; if (task !== undefined) { engine.tasks.register(task); } } engine.adopt(stylesheetPlugin); return engine; }
  static input(colors: InputInterfaceTypeEntity.Type['colors'], roles: RoleSchemaInterfaceTypeEntity.Type, metadata?: InputInterfaceTypeEntity.Type['metadata']): InputInterfaceTypeEntity.Type { const result = InputInterfaceTypeEntity.create({ 'colors': colors, ...(metadata === undefined ? {} : { 'metadata': metadata }), 'roles': roles }); return result; }
}
