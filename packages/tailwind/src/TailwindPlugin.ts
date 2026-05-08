import type {
  MathPrimitiveInterface,
  PluginInterface,
  TaskInterface,
} from '@studnicky/iridis';
import { emitTailwindTheme } from './tasks/EmitTailwindTheme.ts';

export class TailwindPlugin implements PluginInterface {
  readonly name    = 'tailwind';
  readonly version = '0.1.0';

  tasks(): readonly TaskInterface[] {
    return [emitTailwindTheme];
  }

  math(): readonly MathPrimitiveInterface[] {
    return [];
  }
}

export const tailwindPlugin = new TailwindPlugin();
