import type {
  EngineInterface,
  InputInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  PluginInterface,
  TaskInterface,
} from '../model/types.ts';
import { TaskRegistry }      from '../registry/TaskRegistry.ts';
import { ConsoleLogger }     from './ConsoleLogger.ts';

export class Engine implements EngineInterface {
  readonly tasks: TaskRegistry = new TaskRegistry();

  private order: readonly string[] = [];

  adopt(plugin: PluginInterface): void {
    for (const task of plugin.tasks()) {
      this.tasks.register(task);
    }
  }

  pipeline(order: readonly string[]): void {
    for (const name of order) {
      if (!this.tasks.has(name)) {
        throw new Error(`Engine.pipeline: task '${name}' is not registered`);
      }
    }
    this.order = order;
  }

  async run(input: InputInterface): Promise<PaletteStateInterface> {
    const state: PaletteStateInterface = {
      'input':    input,
      'runtime':  { ...input.runtime },
      'colors':   [],
      'roles':    {},
      'variants': {},
      'outputs':  {},
      'metadata': { ...input.metadata },
    };
    const ctx: PipelineContextInterface = {
      'engine':    this,
      'tasks':     this.tasks,
      'logger':    new ConsoleLogger(),
      'startedAt': Date.now(),
      'cache':     new Map<string, unknown>(),
    };

    for (const hook of this.tasks.hooks('onRunStart')) {
      await hook.run(state, ctx);
    }

    const sequence: TaskInterface[] = this.order.length > 0
      ? this.order.map((name) => this.tasks.resolve(name))
      : this.tasks.list().map((manifest) => this.tasks.resolve(manifest.name));

    for (const task of sequence) {
      if (task.manifest?.phase) {
        continue;
      }
      await task.run(state, ctx);
    }

    for (const hook of this.tasks.hooks('onRunEnd')) {
      await hook.run(state, ctx);
    }

    return state;
  }
}

export const engine = new Engine();
