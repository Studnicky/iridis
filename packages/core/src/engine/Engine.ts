import type {
  EngineInterface,
  InputInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  PluginInterface,
  TaskInterface,
} from '../types/index.ts';
import { TaskRegistry }        from '../registry/TaskRegistry.ts';
import { consoleLogger }       from './ConsoleLogger.ts';
import { Validator }           from '../model/Validator.ts';
import { InputSchema }         from '../model/InputSchema.ts';
import { PluginSchema }        from '../model/PluginSchema.ts';
import { PaletteStateSchema }  from '../model/PaletteStateSchema.ts';
import { RoleSchemaSchema }    from '../model/RoleSchemaSchema.ts';
import { TaskManifestSchema }  from '../model/TaskManifestSchema.ts';

/**
 * The single composition root of the iridis pipeline. An Engine owns one
 * `TaskRegistry`; plugins contribute tasks via {@link Engine.adopt},
 * callers select an execution order via {@link Engine.pipeline}, and
 * {@link Engine.run} drives the registered tasks against an input to
 * produce a `PaletteStateInterface`.
 *
 * Engines are intentionally inert until configured. Construct a dedicated
 * `new Engine()` per consumer so registries don't bleed across modules.
 */
export class Engine implements EngineInterface {
  readonly tasks: TaskRegistry = new TaskRegistry();

  private order: readonly string[] = [];

  /**
   * Cached, resolved task sequence for the current `order`. Built by
   * {@link Engine.pipeline} (or by the first {@link Engine.run} when no
   * pipeline was set) and reused across runs. Invalidated to `null` on
   * the next {@link Engine.pipeline} or {@link Engine.adopt} call;
   * either may change which task object resolves for a given name.
   */
  private sequence: readonly TaskInterface[] | null = null;

  /** Plugin names that have been adopted. Used to warn on duplicate names. */
  private readonly adoptedPlugins = new Set<string>();

  /**
   * Per-engine ajv-backed validator (owns the ajv instance and compile cache).
   * Each Engine gets its own Validator so plugin-contributed schemas registered
   * into one Engine's validator don't leak to another.
   */
  private readonly validator: Validator = new Validator();

  /**
   * Accumulated plugin output schema contributions.
   * Key: slot name (e.g. 'json', 'cssVars'). Value: the JSON Schema to validate
   * state.outputs[key] against at run exit.
   */
  private readonly outputSchemas:   Map<string, Record<string, unknown>> = new Map();

  /**
   * Accumulated plugin metadata schema contributions.
   * Key: slot name. Value: the JSON Schema to validate state.metadata[key] against.
   */
  private readonly metadataSchemas: Map<string, Record<string, unknown>> = new Map();

  /**
   * Registers every task and math primitive a plugin contributes in a
   * single call. Idempotent at the registry level: re-adopting a plugin
   * overwrites prior entries with the same names, which is how downstream
   * consumers monkey-patch built-ins.
   *
   * Validates: plugin shape, each task manifest (if present), and each
   * plugin-contributed output/metadata schema (must be ajv-compilable).
   * Rejects on first failure.
   */
  adopt(plugin: PluginInterface): void {
    const pluginResult = this.validator.validate(PluginSchema, plugin);
    if (!pluginResult.valid) {
      const first = pluginResult.errors[0];
      throw new Error(
        `Engine.adopt: plugin invalid: ${first !== undefined ? `${first.path}: ${first.message}` : 'unknown error'}`,
      );
    }

    if (this.adoptedPlugins.has(plugin.name)) {
      console.warn(
        `Engine.adopt: plugin '${plugin.name}' (v${plugin.version}) is already adopted; re-adopting will overwrite its tasks`,
      );
    }
    this.adoptedPlugins.add(plugin.name);

    for (const task of plugin.tasks()) {
      if (task.manifest !== undefined) {
        const manifestResult = this.validator.validate(TaskManifestSchema, task.manifest);
        if (!manifestResult.valid) {
          const first = manifestResult.errors[0];
          throw new Error(
            `Engine.adopt: task '${task.name}' manifest invalid: ${first !== undefined ? `${first.path}: ${first.message}` : 'unknown error'}`,
          );
        }
      }

      const phase = task.manifest?.phase;
      if (phase) {
        this.tasks.hook(phase, task);
      } else {
        this.tasks.register(task);
      }
    }

    // Validate and register plugin-contributed schemas
    if (typeof plugin.schemas === 'function') {
      const contrib = plugin.schemas();

      if (contrib.outputs !== undefined) {
        for (const [slot, schema] of Object.entries(contrib.outputs)) {
          if (!this.validator.tryCompile(schema)) {
            throw new Error(
              `Engine.adopt: plugin '${plugin.name}' contributed malformed output schema for slot '${slot}'`,
            );
          }
          this.outputSchemas.set(slot, schema);
        }
      }

      if (contrib.metadata !== undefined) {
        for (const [slot, schema] of Object.entries(contrib.metadata)) {
          if (!this.validator.tryCompile(schema)) {
            throw new Error(
              `Engine.adopt: plugin '${plugin.name}' contributed malformed metadata schema for slot '${slot}'`,
            );
          }
          this.metadataSchemas.set(slot, schema);
        }
      }
    }

    // Adopting tasks may shadow names already present in the resolved
    // sequence; invalidate so the next `run()` rebuilds against the
    // current registry contents.
    this.sequence = null;
  }

  /**
   * Declares the explicit task execution order for {@link Engine.run}.
   * Each name MUST already be registered; an unknown name throws now
   * (fail-fast at composition) rather than mid-pipeline. When no order
   * is set, `run()` executes tasks in registration order.
   *
   * Re-validates each named task's manifest at pipeline declaration time.
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

    this.order    = order;
    this.sequence = order.map((name) => this.tasks.resolve(name));
  }

  /**
   * Drives the configured pipeline against `input` and returns the final
   * state. Phase-marked tasks (`manifest.phase`) are skipped by the main
   * loop because they're invoked through the `onRunStart` / `onRunEnd`
   * hook channels instead. The returned state is a fresh object owned
   * by this call; callers may mutate it without affecting the engine.
   *
   * Validation points:
   *   - InputSchema at entry
   *   - RoleSchemaSchema on input.roles if present
   *   - PaletteStateSchema on final state at exit
   *   - Plugin-contributed output/metadata schemas at exit
   */
  run(input: InputInterface): PaletteStateInterface {
    const inputResult = this.validator.validate(InputSchema, input);
    if (!inputResult.valid) {
      const first = inputResult.errors[0];
      throw new Error(
        `Engine.run: input invalid: ${first !== undefined ? `${first.path}: ${first.message}` : 'unknown error'}`,
      );
    }

    if (input.roles !== undefined) {
      const rolesResult = this.validator.validate(RoleSchemaSchema, input.roles);
      if (!rolesResult.valid) {
        const first = rolesResult.errors[0];
        throw new Error(
          `Engine.run: input.roles invalid: ${first !== undefined ? `${first.path}: ${first.message}` : 'unknown error'}`,
        );
      }
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
      'logger':    consoleLogger,
      'startedAt': Date.now(),
    };

    for (const hook of this.tasks.hooks('onRunStart')) {
      hook.run(state, ctx);
    }

    if (this.sequence === null) {
      this.sequence = this.order.length > 0
        ? this.order.map((name) => this.tasks.resolve(name))
        : this.tasks.list().map((manifest) => this.tasks.resolve(manifest.name));
    }

    for (const task of this.sequence) {
      if (task.manifest?.phase) {
        continue;
      }
      task.run(state, ctx);
    }

    for (const hook of this.tasks.hooks('onRunEnd')) {
      hook.run(state, ctx);
    }

    const stateResult = this.validator.validate(PaletteStateSchema, state);
    if (!stateResult.valid) {
      const first = stateResult.errors[0];
      throw new Error(
        `Engine.run: output state invalid: ${first !== undefined ? `${first.path}: ${first.message}` : 'unknown error'}`,
      );
    }

    // Validate plugin-contributed output slot schemas
    for (const [slot, schema] of this.outputSchemas) {
      const slotValue = state.outputs[slot];
      if (slotValue !== undefined) {
        const slotResult = this.validator.validate(schema, slotValue);
        if (!slotResult.valid) {
          const first = slotResult.errors[0];
          throw new Error(
            `Engine.run: outputs['${slot}'] failed plugin schema: ${first !== undefined ? `${first.path}: ${first.message}` : 'unknown error'}`,
          );
        }
      }
    }

    // Validate plugin-contributed metadata slot schemas
    for (const [slot, schema] of this.metadataSchemas) {
      const slotValue = state.metadata[slot];
      if (slotValue !== undefined) {
        const slotResult = this.validator.validate(schema, slotValue);
        if (!slotResult.valid) {
          const first = slotResult.errors[0];
          throw new Error(
            `Engine.run: metadata['${slot}'] failed plugin schema: ${first !== undefined ? `${first.path}: ${first.message}` : 'unknown error'}`,
          );
        }
      }
    }

    return state;
  }
}
