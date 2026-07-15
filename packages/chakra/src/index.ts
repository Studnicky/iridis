import './types/augmentation.ts';
import { ChakraPlugin }    from './ChakraPlugin.ts';
import { EmitChakraTheme } from './tasks/EmitChakraTheme.ts';

export { ChakraPlugin };
export { EmitChakraTheme };
export const chakraPlugin    = new ChakraPlugin();
export const emitChakraTheme = new EmitChakraTheme();
export type { ChakraOutputInterfaceType } from './types/index.ts';
