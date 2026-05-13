import type {
  EngineInterface,
  InputInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  PluginInterface,
  TaskInterface,
} from '../types/index.ts';
import { TaskRegistry }      from '../registry/TaskRegistry.ts';
import { ConsoleLogger }     from './ConsoleLogger.ts';
import { validator }         from '../model/Validator.ts';
import { InputSchema }       from '../model/InputSchema.ts';
import { PluginSchema }      from '../model/PluginSchema.ts';

/**
 * The single composition root of the iridis pipeline. An Engine owns one
 * `TaskRegistry` and one `ColorMathRegistry`; plugins contribute tasks and
 * math primitives via {@link Engine.adopt}, callers select an execution
 * order via {@link Engine.pipeline}, and {@link Engine.run} drives the
 * registered tasks against an input to produce a `PaletteStateInterface`.
 *
 * Engines are intentionally inert until configured. The exported singleton
 * `engine` is provided for one-shot scripts; library/app code should
 * construct its own instance so registries don't bleed across consumers.
 */
export class Engine implements EngineInterface {
  readonly tasks: TaskRegistry = new TaskRegistry();

  private order: readonly string[] = [];

  /**
   * Registers every task and math primitive a plugin contributes in a
   * single call. Idempotent at the registry level: re-adopting a plugin
   * overwrites prior entries with the same names, which is how downstream
   * consumers monkey-patch built-ins.
   *
   * The plugin shape is validated against `PluginSchema` at the boundary.
   * Well-formed plugins pass in O(1); the check is fast enough to leave on
   * in production.
   */
  adopt(plugin: PluginInterface): void {
    const result = validator.validate(PluginSchema, plugin);
    if (!result.valid) {
      const first = result.errors[0];
      throw new Error(
        `Engine.adopt: plugin invalid — ${first !== undefined ? `${first.path}: ${first.message}` : 'unknown error'}`,
      );
    }

    for (const task of plugin.tasks()) {
      const phase = task.manifest?.phase;
      if (phase) {
        this.tasks.hook(phase, task);
      } else {
        this.tasks.register(task);
      }
    }
  }

  /**
   * Declares the explicit task execution order for {@link Engine.run}.
   * Each name MUST already be registered; an unknown name throws now
   * (fail-fast at composition) rather than mid-pipeline. When no order
   * is set, `run()` executes tasks in registration order.
   */
  pipeline(order: readonly string[]): void {
    for (const name of order) {
      if (!this.tasks.has(name)) {
        throw new Error(`Engine.pipeline: task '${name}' is not registered`);
      }
    }

    for (let i = 0; i < order.length; i++) {
      const name     = order[i] as string;
      const task     = this.tasks.resolve(name);
      const requires = task.manifest?.requires;

      if (!requires) {
        continue;
      }

      for (const dep of requires) {
        // Only enforce requires entries that refer to registered tasks.
        // Math primitive names appear in requires as documentation and are
        // not subject to pipeline ordering constraints.
        if (!this.tasks.has(dep)) {
          continue;
        }

        const depIndex = order.indexOf(dep);

        if (depIndex === -1) {
          throw new Error(
            `Engine.pipeline: task '${name}' requires '${dep}', which is missing from the pipeline entirely`,
          );
        }

        if (depIndex >= i) {
          throw new Error(
            `Engine.pipeline: task '${name}' requires '${dep}', which must appear earlier in the pipeline`,
          );
        }
      }
    }

    this.order = order;
  }

  /**
   * Drives the configured pipeline against `input` and returns the final
   * state. Phase-marked tasks (`manifest.phase`) are skipped by the main
   * loop because they're invoked through the `onRunStart` / `onRunEnd`
   * hook channels instead. The returned state is a fresh object owned
   * by this call — callers may mutate it without affecting the engine.
   */
  async run(input: InputInterface): Promise<PaletteStateInterface> {
    const inputResult = validator.validate(InputSchema, input);
    if (!inputResult.valid) {
      const first = inputResult.errors[0];
      throw new Error(
        `Engine.run: input invalid — ${first !== undefined ? `${first.path}: ${first.message}` : 'unknown error'}`,
      );
    }

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

/**
 * Process-wide convenience instance. Useful for one-off scripts and the
 * REPL; production consumers should construct a dedicated `new Engine()`
 * so registries don't leak between modules.
 */
export const engine = new Engine();
