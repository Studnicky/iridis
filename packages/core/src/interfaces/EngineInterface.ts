import type { InputInterface } from './InputInterface.ts';
import type { PaletteStateInterface } from './PaletteStateInterface.ts';
import type { PluginInterface } from './PluginInterface.ts';
import type { TaskRegistryInterface } from './TaskRegistryInterface.ts';

export interface EngineInterface {
  adopt(plugin: PluginInterface): void;
  pipeline(order: readonly string[]): void;
  run(input: InputInterface): PaletteStateInterface;
  readonly 'tasks': TaskRegistryInterface;
}
