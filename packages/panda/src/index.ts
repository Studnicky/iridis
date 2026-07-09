import './types/augmentation.ts';
import { PandaPlugin }    from './PandaPlugin.ts';
import { EmitPandaTheme } from './tasks/EmitPandaTheme.ts';

export { PandaPlugin };
export { EmitPandaTheme };
export const pandaPlugin    = new PandaPlugin();
export const emitPandaTheme = new EmitPandaTheme();
export type { PandaOutputInterfaceType } from './types/index.ts';
