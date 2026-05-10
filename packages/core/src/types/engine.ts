import type { ColorMathRegistryInterface, TaskRegistryInterface } from './registry.ts';
import type { InputInterface, PaletteStateInterface } from './state.ts';
import type { PluginInterface } from './plugin.ts';

export interface EngineInterface {
  readonly tasks: TaskRegistryInterface;
  readonly math:  ColorMathRegistryInterface;
  adopt(plugin: PluginInterface): void;
  pipeline(order: readonly string[]): void;
  run(input: InputInterface): Promise<PaletteStateInterface>;
}
