import type { PluginInterface } from './plugin.ts';
import type { TaskRegistryInterface } from './registry.ts';
import type { InputInterface, PaletteStateInterface } from './state.ts';

export interface EngineInterface {
  adopt(plugin: PluginInterface): void;
  pipeline(order: readonly string[]): void;
  run(input: InputInterface): PaletteStateInterface;
  readonly 'tasks': TaskRegistryInterface;
}
