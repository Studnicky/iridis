import { InputEntity, type RoleSchemaEntity } from '@studnicky/iridis';
import { Engine } from '@studnicky/iridis/engine';
import { coreTasks } from '@studnicky/iridis/tasks';

import { stylesheetPlugin } from '../../../src/index.ts';

export class StylesheetScenarioFixture {
  static engine(): Engine { const engine = new Engine(); for (let index = 0; index < coreTasks.length; index += 1) { const task = coreTasks[index]; if (task !== undefined) { engine.tasks.register(task); } } engine.adopt(stylesheetPlugin); return engine; }
  static input(colors: InputEntity.Type['colors'], roles: RoleSchemaEntity.Type, metadata?: InputEntity.Type['metadata']): InputEntity.Type { const result = InputEntity.create({ 'colors': colors, ...(metadata === undefined ? {} : { 'metadata': metadata }), 'roles': roles }); return result; }
}
