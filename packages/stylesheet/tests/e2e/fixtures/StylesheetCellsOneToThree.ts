import { stylesheetPlugin } from '../../../src/index.ts';
import { StylesheetRoleSchemas } from './StylesheetRoleSchemas.ts';

export const StylesheetCellsOneToThree = Object.freeze({
  'PLUGIN_NAME': stylesheetPlugin.name,
  'PLUGIN_TASK_NAMES': stylesheetPlugin.tasks().map((task) => { const result = task.name; return result; }),
  'SINGLE_ROLE_SCHEMA': StylesheetRoleSchemas.single,
  'TWO_ROLE_SCHEMA': StylesheetRoleSchemas.two
});
