import './types/augmentation.ts';
import { MuiPlugin }    from './MuiPlugin.ts';
import { EmitMuiTheme } from './tasks/EmitMuiTheme.ts';

export { MuiPlugin };
export { EmitMuiTheme };
export const muiPlugin    = new MuiPlugin();
export const emitMuiTheme = new EmitMuiTheme();
export type { MuiOutputInterfaceType } from './types/index.ts';
