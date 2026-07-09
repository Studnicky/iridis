import './types/augmentation.ts';
import { TailwindPlugin }    from './TailwindPlugin.ts';
import { EmitTailwindTheme } from './tasks/EmitTailwindTheme.ts';

export { TailwindPlugin };
export { EmitTailwindTheme };
export const tailwindPlugin    = new TailwindPlugin();
export const emitTailwindTheme = new EmitTailwindTheme();
export type { TailwindOutputInterfaceType } from './types/index.ts';
