import './types/augmentation.ts';
import { ShadcnOutputEntity } from './entities/ShadcnOutputEntity.ts';
import { ShadcnPlugin } from './ShadcnPlugin.ts';
import { EmitShadcnTheme } from './tasks/EmitShadcnTheme.ts';

export { EmitShadcnTheme };
export { ShadcnOutputEntity };
export { ShadcnPlugin };
export const shadcnPlugin = new ShadcnPlugin();
export const emitShadcnTheme = new EmitShadcnTheme();
