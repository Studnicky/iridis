import type {
  MathPrimitiveInterface,
  PluginInterface,
  TaskInterface,
} from '@studnicky/iridis';
import { emitCssVars }       from './tasks/EmitCssVars.ts';
import { emitCssVarsScoped } from './tasks/EmitCssVarsScoped.ts';

export class CssVarsPlugin implements PluginInterface {
  readonly name    = 'css-vars';
  readonly version = '0.1.0';

  tasks(): readonly TaskInterface[] {
    return [emitCssVars, emitCssVarsScoped];
  }

  math(): readonly MathPrimitiveInterface[] {
    return [];
  }
}

export const cssVarsPlugin    = new CssVarsPlugin();
export const stylesheetPlugin = cssVarsPlugin;
