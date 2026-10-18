import './types/augmentation.ts';
import { TailwindPlugin } from './TailwindPlugin.ts';

export { TailwindPlugin };
export type { TailwindOutputInterface } from './interfaces/TailwindOutputInterface.ts';
export { EmitTailwindTheme } from './tasks/EmitTailwindTheme.ts';
export const tailwindPlugin = new TailwindPlugin();
export { emitTailwindTheme } from './tasks/singleton/EmitTailwindTheme.ts';
