import type {
  MathPrimitiveInterface,
  PluginInterface,
  TaskInterface,
} from '@studnicky/iridis';
import { emitCssVars }       from './tasks/EmitCssVars.ts';
import { emitCssVarsScoped } from './tasks/EmitCssVarsScoped.ts';

export class StylesheetPlugin implements PluginInterface {
  readonly 'name'    = 'stylesheet';

  readonly 'version' = '0.1.0';

  tasks(): readonly TaskInterface[] {
    return [emitCssVars, emitCssVarsScoped];
  }

  math(): readonly MathPrimitiveInterface[] {
    return [];
  }
}

export const stylesheetPlugin = new StylesheetPlugin();
