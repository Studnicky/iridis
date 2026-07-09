import './types/augmentation.ts';
import { ShadcnPlugin }    from './ShadcnPlugin.ts';
import { EmitShadcnTheme } from './tasks/EmitShadcnTheme.ts';

export { ShadcnPlugin };
export { EmitShadcnTheme };
export const shadcnPlugin    = new ShadcnPlugin();
export const emitShadcnTheme = new EmitShadcnTheme();
export type { ShadcnOutputInterfaceType } from './types/index.ts';
