import './types/augmentation.ts';
import { TailwindPlugin } from './TailwindPlugin.ts';

export { TailwindPlugin };
export { EmitTailwindTheme } from './tasks/EmitTailwindTheme.ts';
export { emitTailwindTheme } from './tasks/singleton/EmitTailwindTheme.ts';
export const tailwindPlugin = new TailwindPlugin();
export type { TailwindOutputInterfaceType } from './types/index.ts';
