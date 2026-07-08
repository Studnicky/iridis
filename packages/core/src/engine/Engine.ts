import type { JsonObjectType } from '@studnicky/types';

import { ModuleError, ValidationError } from '@studnicky/errors';
import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import type {
  EngineInterface,
  InputInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  PluginInterface,
  TaskInterface
} from '../types/index.ts';

import { InputSchema }         from '../model/InputSchema.ts';
import { PaletteStateSchema }  from '../model/PaletteStateSchema.ts';
import { PluginSchema }        from '../model/PluginSchema.ts';
import { RoleSchemaSchema }    from '../model/RoleSchemaSchema.ts';
import { TaskManifestSchema }  from '../model/TaskManifestSchema.ts';
import { Validator }           from '../model/Validator.ts';
import { TaskRegistry }        from '../registry/TaskRegistry.ts';
import { consoleLogger }       from './ConsoleLogger.ts';

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
  private readonly validator: InstanceType<typeof Validator> = new Validator();

  /**
   * Accumulated plugin output schema contributions.
   * Key: slot name (e.g. 'json', 'cssVars'). Value: the JSON Schema to validate
   * state.outputs[key] against at run exit.
   */
  private readonly outputSchemas:   Map<string, JsonObjectType> = new Map();

  /**
   * Accumulated plugin metadata schema contributions.
   * Key: slot name. Value: the JSON Schema to validate state.metadata[key] against.
   */
  private readonly metadataSchemas: Map<string, JsonObjectType> = new Map();

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
      throw ValidationError.create({
        'message':    `plugin invalid: ${first !== undefined ? `${first.path}: ${first.message}` : 'unknown error'}`,
        'path':       'plugin',
        'violations': pluginResult.errors
      });
    }

    if (this.adoptedPlugins.has(plugin.name)) {
      consoleLogger.warn(
        LogBody.create()
          .component('Engine')
          .operation('adopt')
          .status(LOG_STATUS.PARTIAL)
          .message(`Plugin '${plugin.name}' (v${plugin.version}) is already adopted; re-adopting will overwrite its tasks`)
          .context({ 'plugin': plugin.name, 'version': plugin.version })
          .build()
      );
    }
    this.adoptedPlugins.add(plugin.name);

    for (const task of plugin.tasks()) {
      if (task.manifest !== undefined) {
        const manifestResult = this.validator.validate(TaskManifestSchema, task.manifest);
        if (!manifestResult.valid) {
          const first = manifestResult.errors[0];
          throw ValidationError.create({
            'message':    `manifest invalid: ${first !== undefined ? `${first.path}: ${first.message}` : 'unknown error'}`,
            'path':       `plugin.tasks['${task.name}'].manifest`,
            'violations': manifestResult.errors
          });
        }
      }

      const phase = task.manifest?.phase;
      if (phase !== undefined) {
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
            throw ModuleError.create(
              `plugin '${plugin.name}' contributed malformed output schema for slot '${slot}'`,
              {
                'context':  { 'kind': 'outputs', 'plugin': plugin.name, 'slot': slot },
                'scenario': 'CONFIGURATION'
              }
            );
          }
          this.outputSchemas.set(slot, schema);
        }
      }

      if (contrib.metadata !== undefined) {
        for (const [slot, schema] of Object.entries(contrib.metadata)) {
          if (!this.validator.tryCompile(schema)) {
            throw ModuleError.create(
              `plugin '${plugin.name}' contributed malformed metadata schema for slot '${slot}'`,
              {
                'context':  { 'kind': 'metadata', 'plugin': plugin.name, 'slot': slot },
                'scenario': 'CONFIGURATION'
              }
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
        throw ModuleError.create(`Engine.pipeline: task '${name}' is not registered`, {
          'context':  { 'operation': 'pipeline', 'taskName': name },
          'scenario': 'NOT_FOUND'
        });
      }
    }

    for (let i = 0; i < order.length; i++) {
      const name     = order[i]!;
      const task     = this.tasks.resolve(name);
      const requires = task.manifest?.requires;

      if (requires === undefined) {
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
          throw ModuleError.create(
            `Engine.pipeline: task '${name}' requires '${dep}', which is missing from the pipeline entirely`,
            {
              'context':  { 'dependency': dep, 'operation': 'pipeline', 'reason': 'missing-from-pipeline', 'taskName': name },
              'scenario': 'CONFIGURATION'
            }
          );
        }

        if (depIndex >= i) {
          throw ModuleError.create(
            `Engine.pipeline: task '${name}' requires '${dep}', which must appear earlier in the pipeline`,
            {
              'context':  { 'dependency': dep, 'operation': 'pipeline', 'reason': 'out-of-order', 'taskName': name },
              'scenario': 'CONFIGURATION'
            }
          );
        }
      }
    }

    this.order    = order;
    this.sequence = order.map((name) => { const result = this.tasks.resolve(name); return result; });
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
      throw ValidationError.create({
        'message':    `input invalid: ${first !== undefined ? `${first.path}: ${first.message}` : 'unknown error'}`,
        'path':       'input',
        'violations': inputResult.errors
      });
    }

    if (input.roles !== undefined) {
      const rolesResult = this.validator.validate(RoleSchemaSchema, input.roles);
      if (!rolesResult.valid) {
        const first = rolesResult.errors[0];
        throw ValidationError.create({
          'message':    `input.roles invalid: ${first !== undefined ? `${first.path}: ${first.message}` : 'unknown error'}`,
          'path':       'input.roles',
          'violations': rolesResult.errors
        });
      }
    }

    const state: PaletteStateInterface = {
      'colors':   [],
      'input':    input,
      'metadata': { ...input.metadata },
      'outputs':  {},
      'roles':    {},
      'runtime':  { ...input.runtime },
      'variants': {}
    };
    const ctx: PipelineContextInterface = {
      'engine':    this,
      'logger':    consoleLogger,
      'startedAt': Date.now(),
      'tasks':     this.tasks
    };

    for (const hook of this.tasks.hooks('onRunStart')) {
      hook.run(state, ctx);
    }

    this.sequence ??= this.order.length > 0
      ? this.order.map((name) => { const result = this.tasks.resolve(name); return result; })
      : this.tasks.list().map((manifest) => { const result = this.tasks.resolve(manifest.name); return result; });

    for (const task of this.sequence) {
      if (task.manifest?.phase !== undefined) {
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
      throw ValidationError.create({
        'message':    `output state invalid: ${first !== undefined ? `${first.path}: ${first.message}` : 'unknown error'}`,
        'path':       'state',
        'violations': stateResult.errors
      });
    }

    // Validate plugin-contributed output slot schemas
    for (const [slot, schema] of this.outputSchemas) {
      const slotValue = state.outputs[slot];
      if (slotValue !== undefined) {
        const slotResult = this.validator.validate(schema, slotValue);
        if (!slotResult.valid) {
          const first = slotResult.errors[0];
          throw ValidationError.create({
            'message':    `failed plugin schema: ${first !== undefined ? `${first.path}: ${first.message}` : 'unknown error'}`,
            'path':       `outputs['${slot}']`,
            'violations': slotResult.errors
          });
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
          throw ValidationError.create({
            'message':    `failed plugin schema: ${first !== undefined ? `${first.path}: ${first.message}` : 'unknown error'}`,
            'path':       `metadata['${slot}']`,
            'violations': slotResult.errors
          });
        }
      }
    }

    return state;
  }
}
