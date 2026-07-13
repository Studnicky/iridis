import './types/augmentation.ts';
import { TailwindPlugin } from './TailwindPlugin.ts';

export { TailwindPlugin };
export { EmitTailwindTheme, emitTailwindTheme } from './tasks/EmitTailwindTheme.ts';
export const tailwindPlugin = new TailwindPlugin();
export type { TailwindOutputInterfaceType } from './types/index.ts';
