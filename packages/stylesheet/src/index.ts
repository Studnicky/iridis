import './types/augmentation.ts';

export type { CssVarsOutputInterface } from './interfaces/CssVarsOutputInterface.ts';
export type { CssVarsScopedOutputInterface } from './interfaces/CssVarsScopedOutputInterface.ts';
export { stylesheetPlugin }  from './StylesheetPlugin.ts';
export { emitCssVars }       from './tasks/EmitCssVars.ts';
export { emitCssVarsScoped } from './tasks/EmitCssVarsScoped.ts';
