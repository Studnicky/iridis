import type { JsonSchemaObjectType } from '@studnicky/json-tology/types';
import type { JSONSchema7Type } from 'json-schema';

import { ModuleError, ValidationError } from '@studnicky/errors/node';
import { LOG_STATUS, LogBody } from '@studnicky/logger/node';
import { JsonObject, JsonValue } from '@studnicky/types/node';

import type { ValidationErrorInterfaceTypeEntity } from '../entities/ValidationErrorInterfaceTypeEntity.ts';
import type {
  EngineInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  PluginInterface,
  TaskInterface
} from '../types/index.ts';

import { InputInterfaceTypeEntity } from '../entities/InputInterfaceTypeEntity.ts';
import { RuntimeOptionsInterfaceTypeEntity } from '../entities/RuntimeOptionsInterfaceTypeEntity.ts';
import { ContrastRatioSchema } from '../model/ContrastRatioSchema.ts';
import { PaletteStateSchema }  from '../model/PaletteStateSchema.ts';
import { PluginSchema }        from '../model/PluginSchema.ts';
import { RoleSchemaSchema }    from '../model/RoleSchemaSchema.ts';
import { TaskManifestSchema }  from '../model/TaskManifestSchema.ts';
import { Validator }           from '../model/Validator.ts';
import { TaskRegistry }        from '../registry/TaskRegistry.ts';
import { consoleLogger }       from './ConsoleLogger.ts';

class InputJsonRecord {
  static admit(value: InputInterfaceTypeEntity.Type['metadata'], path: string): Record<string, JSONSchema7Type> | undefined {
    if (value === undefined) {
      return undefined;
    }

    const result: Record<string, JSONSchema7Type> = {};
    const entries = Object.entries(value);
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry === undefined) {
        continue;
      }
      const [name, candidate] = entry;
      if (!JsonValue.is(candidate) || !JsonObject.write(result, name, candidate)) {
        throw ValidationError.create({
          'message': `input invalid: ${path}.${name} must be JSON data`,
          'path':    `input.${path}.${name}`,
          'violations': [{ 'message': 'must be JSON data', 'path': `input.${path}.${name}` }]
        });
      }
    }
    return result;
  }
}

class ContrastRatioDomain {
  static readonly apca = new ContrastRatioDomain(ContrastRatioSchema.apca.minimum, ContrastRatioSchema.apca.maximum);
  static readonly wcag21 = new ContrastRatioDomain(ContrastRatioSchema.wcag21.minimum, ContrastRatioSchema.wcag21.maximum);

  readonly maximum: number;
  readonly minimum: number;

  private constructor(minimum: number, maximum: number) {
    this.maximum = maximum;
    this.minimum = minimum;
  }
}

class ContrastPairBounds {
  static validate(
    ratios: {
      readonly 'maximumContrastRatio'?: number;
      readonly 'minimumContrastRatio'?: number;
    },
    domain: ContrastRatioDomain,
    location: {
      readonly 'collectionName': string;
      readonly 'index': number;
      readonly 'inputPath': string;
    }
  ): void {
    const { maximumContrastRatio, minimumContrastRatio } = ratios;
    const { collectionName, index, inputPath } = location;
    ContrastPairBounds.validateRatio(minimumContrastRatio, domain, inputPath, collectionName, index, 'minimumContrastRatio');
    ContrastPairBounds.validateRatio(maximumContrastRatio, domain, inputPath, collectionName, index, 'maximumContrastRatio');
    if (maximumContrastRatio === undefined || minimumContrastRatio === undefined || maximumContrastRatio >= minimumContrastRatio) {
      return;
    }
    const path = `${collectionName}[${index}].maximumContrastRatio`;
    throw ValidationError.create({
      'message': `${inputPath} invalid: ${path}: must be greater than or equal to minimumContrastRatio`,
      'path': inputPath,
      'violations': [{ 'message': 'must be greater than or equal to minimumContrastRatio', 'path': path }]
    });
  }

  private static validateRatio(
    value: number | undefined,
    domain: ContrastRatioDomain,
    inputPath: string,
    collectionName: string,
    index: number,
    propertyName: string
  ): void {
    if (value === undefined || (value >= domain.minimum && value <= domain.maximum)) {
      return;
    }
    const path = `${collectionName}[${index}].${propertyName}`;
    throw ValidationError.create({
      'message': `${inputPath} invalid: ${path}: must be between ${domain.minimum} and ${domain.maximum} for the effective contrast algorithm`,
      'path': inputPath,
      'violations': [{ 'message': `must be between ${domain.minimum} and ${domain.maximum} for the effective contrast algorithm`, 'path': path }]
    });
  }
}

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
   * pipeline was set) and reused across runs as long as `sequenceVersion`
   * still matches `this.tasks`'s mutation counter. Any registry mutation —
   * whether via {@link Engine.adopt} or a direct `engine.tasks.register()` /
   * `engine.tasks.hook()` call — bumps that counter, so the next `run()`
   * rebuilds against the current registry contents instead of reusing a
   * sequence that may point at shadowed or newly-registered task objects.
   */
  private sequence: readonly TaskInterface[] | null = null;

  /** `this.tasks.version()` at the time `sequence` was last built. */
  private sequenceVersion = -1;

  /** Plugin names that have been adopted. Used to warn on duplicate names. */
  private readonly adoptedPlugins = new Set<string>();

  /**
   * Per-engine json-tology-backed validator wrapper (see `Validator.ts`).
   * Each Engine constructs its own `Validator` instance, but every instance
   * wraps the same process-wide json-tology registry (`CoreRegistry`), so
   * plugin-contributed schemas registered through one Engine's validator are
   * visible to validations performed via any other Engine's validator —
   * registration is not isolated per Engine.
   */
  private readonly validator: InstanceType<typeof Validator> = new Validator();

  /**
   * Accumulated plugin output schema contributions.
   * Key: slot name (e.g. 'json', 'cssVars'). Value: the JSON Schema to validate
   * state.outputs[key] against at run exit.
   */
  private readonly outputSchemas:   Map<string, JsonSchemaObjectType> = new Map();

  /**
   * Accumulated plugin metadata schema contributions.
   * Key: slot name. Value: the JSON Schema to validate state.metadata[key] against.
   */
  private readonly metadataSchemas: Map<string, JsonSchemaObjectType> = new Map();

  /**
   * Registers every task and math primitive a plugin contributes in a
   * single call. Idempotent at the registry level: re-adopting a plugin
   * overwrites prior entries with the same names, which is how downstream
   * consumers monkey-patch built-ins.
   *
   * Validates: plugin shape, each task manifest (if present), and each
   * plugin-contributed output/metadata schema (must be json-tology-compilable).
   * Rejects on first failure.
   */
  adopt(plugin: PluginInterface): void {
    this.validatePlugin(plugin);
    this.warnOnDuplicatePlugin(plugin);
    this.registerPluginTasks(plugin);
    this.registerPluginSchemas(plugin);
    this.sequence = null;
    this.validateConfiguredOrder();
  }

  private validatePlugin(plugin: PluginInterface): void {
    const identity = { 'name': plugin.name, 'version': plugin.version };
    const result = this.validator.validate(PluginSchema, identity);
    if (result.errors.length > 0) {
      this.throwInvalid('plugin invalid', 'plugin', result.errors);
    }
    if (typeof plugin.tasks !== 'function') {
      this.throwInvalid('plugin invalid', 'plugin.tasks', [{ 'message': 'must be a function', 'path': 'plugin.tasks' }]);
    }
    if (plugin.schemas !== undefined && typeof plugin.schemas !== 'function') {
      this.throwInvalid('plugin invalid', 'plugin.schemas', [{ 'message': 'must be a function when supplied', 'path': 'plugin.schemas' }]);
    }
  }

  private warnOnDuplicatePlugin(plugin: PluginInterface): void {
    if (this.adoptedPlugins.has(plugin.name)) {
      consoleLogger.warn(LogBody.create({
        'component': 'Engine',
        'context': { 'plugin': plugin.name, 'version': plugin.version },
        'message': `Plugin '${plugin.name}' (v${plugin.version}) is already adopted; re-adopting will overwrite its tasks`,
        'operation': 'adopt',
        'status': LOG_STATUS.PARTIAL
      }));
    }
    this.adoptedPlugins.add(plugin.name);
  }

  private registerPluginTasks(plugin: PluginInterface): void {
    const tasks = plugin.tasks();
    for (let index = 0; index < tasks.length; index += 1) {
      const task = tasks[index];
      if (task !== undefined) {
        this.registerPluginTask(plugin.name, task);
      }
    }
  }

  private registerPluginTask(pluginName: string, task: TaskInterface): void {
    if (task.manifest !== undefined) {
      const result = this.validator.validate(TaskManifestSchema, task.manifest);
      if (result.errors.length > 0) {
        this.throwInvalid('manifest invalid', `plugin.tasks['${task.name}'].manifest`, result.errors);
      }
    }

    const phase = task.manifest?.phase;
    if (phase !== undefined) {
      this.tasks.hook(task);
      return;
    }
    this.tasks.register(task);
  }

  private registerPluginSchemas(plugin: PluginInterface): void {
    if (typeof plugin.schemas !== 'function') {
      return;
    }
    const contribution = plugin.schemas();
    if (contribution.outputs !== undefined) {
      this.registerSchemaSlots(plugin.name, JsonValue.from(contribution.outputs), this.outputSchemas, 'outputs');
    }
    if (contribution.metadata !== undefined) {
      this.registerSchemaSlots(plugin.name, JsonValue.from(contribution.metadata), this.metadataSchemas, 'metadata');
    }
  }

  private registerSchemaSlots(
    pluginName: string,
    contributedSchemas: JSONSchema7Type,
    targetSchemas: Map<string, JsonSchemaObjectType>,
    slotKind: string
  ): void {
    if (!JsonObject.is(contributedSchemas)) {
      throw ModuleError.create(`plugin '${pluginName}' contributed malformed ${slotKind} schemas`, {
        'context': { 'kind': slotKind, 'plugin': pluginName },
        'scenario': 'CONFIGURATION'
      });
    }
    const entries = Object.entries(contributedSchemas);
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry === undefined) {
        continue;
      }
      const [slot, candidate] = entry;
      const schema = JsonValue.from(candidate);
      if (!this.validator.tryCompile(schema)) {
        throw ModuleError.create(`plugin '${pluginName}' contributed malformed ${slotKind} schema for slot '${slot}'`, {
          'context': { 'kind': slotKind, 'plugin': pluginName, 'slot': slot },
          'scenario': 'CONFIGURATION'
        });
      }
      targetSchemas.set(slot, schema);
    }
  }

  private validateConfiguredOrder(): void {
    if (this.order.length > 0) {
      this.validateRequiresOrdering(this.order);
    }
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
    for (let index = 0; index < order.length; index += 1) {
      const name = order[index];
      if (name === undefined || this.tasks.has(name)) {
        continue;
      }
      throw ModuleError.create(`Engine.pipeline: task '${name}' is not registered`, {
        'context':  { 'operation': 'pipeline', 'taskName': name },
        'scenario': 'NOT_FOUND'
      });
    }

    this.validateRequiresOrdering(order);

    this.order           = order;
    const sequence       = this.resolveTasks(order);
    this.sequence        = sequence;
    this.sequenceVersion = this.tasks.version();
  }

  /**
   * Validates that every `requires` predecessor named by a task in `order`
   * appears earlier in `order` than the task that names it.
   *
   * A `requires` entry is skipped (treated as satisfied, no position check)
   * when it names either: a task the registry doesn't know about (math
   * primitives documented as a `requires` entry, not subject to pipeline
   * ordering), or a phase/hook task — those run out-of-band through the
   * `onRunStart`/`onRunEnd` channels rather than the ordered sequence, so
   * they never appear in `order` yet are always satisfied by the time the
   * main sequence runs.
   *
   * Shared by {@link Engine.pipeline} (declaration time) and
   * {@link Engine.adopt} (re-validation when an override changes what a
   * name in the existing `order` resolves to).
   */
  private validateRequiresOrdering(order: readonly string[]): void {
    const orderLength = order.length;
    const orderIndexByName = new Map<string, number>(order.map((name, index) => { return [name, index]; }));

    for (let i = 0; i < orderLength; i++) {
      const name     = order[i]!;
      const task     = this.tasks.resolve(name);
      const requires = task.manifest?.requires;

      if (requires === undefined) {
        continue;
      }

      for (let dependencyIndex = 0; dependencyIndex < requires.length; dependencyIndex += 1) {
        const dependency = requires[dependencyIndex];
        if (dependency !== undefined) {
          this.validateTaskDependency(name, i, dependency, orderIndexByName);
        }
      }
    }
  }

  private validateTaskDependency(taskName: string, taskIndex: number, dependency: string, orderIndexByName: ReadonlyMap<string, number>): void {
    if (!this.tasks.has(dependency) || this.tasks.resolve(dependency).manifest?.phase !== undefined) {
      return;
    }

    const predecessorIndex = orderIndexByName.get(dependency);
    if (predecessorIndex === undefined) {
      throw ModuleError.create(
        `Engine.pipeline: task '${taskName}' requires '${dependency}', which is missing from the pipeline entirely`,
        {
          'context':  { 'dependency': dependency, 'operation': 'pipeline', 'reason': 'missing-from-pipeline', 'taskName': taskName },
          'scenario': 'CONFIGURATION'
        }
      );
    }

    if (predecessorIndex >= taskIndex) {
      throw ModuleError.create(
        `Engine.pipeline: task '${taskName}' requires '${dependency}', which must appear earlier in the pipeline`,
        {
          'context':  { 'dependency': dependency, 'operation': 'pipeline', 'reason': 'out-of-order', 'taskName': taskName },
          'scenario': 'CONFIGURATION'
        }
      );
    }
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
  run(input: InputInterfaceTypeEntity.Type): PaletteStateInterface {
    this.validateInput(input);
    const state = this.createState(input);
    const context = this.createPipelineContext();
    this.runHookTasks(this.tasks.onRunStartTasks(), state, context);
    this.runPipelineTasks(this.resolveSequence(), state, context);
    this.runHookTasks(this.tasks.onRunEndTasks(), state, context);
    this.validateState(state);
    this.validatePluginSlots(this.outputSchemas, state.outputs, 'outputs');
    this.validatePluginSlots(this.metadataSchemas, state.metadata, 'metadata');
    return state;
  }

  private validateInput(input: InputInterfaceTypeEntity.Type): void {
    const { maximumColorCount, ...schemaInput } = input;
    this.validateMaximumColorCount(maximumColorCount);
    const result = this.validator.validate(
      InputInterfaceTypeEntity.Schema,
      maximumColorCount === Infinity ? schemaInput : input
    );
    if (result.errors.length > 0) {
      this.throwInvalid('input invalid', 'input', result.errors);
    }
    if (input.roles !== undefined) {
      const roleResult = this.validator.validate(RoleSchemaSchema, input.roles);
      if (roleResult.errors.length > 0) {
        this.throwInvalid('input.roles invalid', 'input.roles', roleResult.errors);
      }
    }
    this.validateContrastPairBounds(input);
  }

  private validateMaximumColorCount(maximumColorCount: number | undefined): void {
    if (maximumColorCount === undefined || maximumColorCount === Infinity) {
      return;
    }
    if (Number.isSafeInteger(maximumColorCount) && maximumColorCount >= 1) {
      return;
    }
    throw ValidationError.create({
      'message': 'input invalid: maximumColorCount must be a safe integer greater than or equal to 1, or Infinity',
      'path':    'input.maximumColorCount',
      'violations': [{
        'message': 'must be a safe integer greater than or equal to 1, or Infinity',
        'path':    'input.maximumColorCount'
      }]
    });
  }

  private validateContrastPairBounds(input: InputInterfaceTypeEntity.Type): void {
    const defaultDomain = input.contrast?.algorithm === 'apca'
      ? ContrastRatioDomain.apca
      : ContrastRatioDomain.wcag21;
    this.validateRoleContrastPairs(input, defaultDomain);
    this.validateExtraContrastPairs(input, defaultDomain);
  }

  private validateRoleContrastPairs(input: InputInterfaceTypeEntity.Type, defaultDomain: ContrastRatioDomain): void {
    const pairs = input.roles?.contrastPairs;
    if (pairs === undefined) {
      return;
    }
    for (let pairIndex = 0; pairIndex < pairs.length; pairIndex += 1) {
      const pair = pairs[pairIndex];
      if (pair === undefined) {
        continue;
      }
      let domain = defaultDomain;
      if (pair.algorithm === 'apca') {
        domain = ContrastRatioDomain.apca;
      } else if (pair.algorithm === 'wcag21') {
        domain = ContrastRatioDomain.wcag21;
      }
      ContrastPairBounds.validate(
        {
          ...(pair.maximumContrastRatio === undefined ? {} : { 'maximumContrastRatio': pair.maximumContrastRatio }),
          ...(pair.minimumContrastRatio === undefined ? {} : { 'minimumContrastRatio': pair.minimumContrastRatio })
        },
        domain,
        { 'collectionName': 'contrastPairs', 'index': pairIndex, 'inputPath': 'input.roles' }
      );
    }
  }

  private validateExtraContrastPairs(input: InputInterfaceTypeEntity.Type, defaultDomain: ContrastRatioDomain): void {
    const pairs = input.contrast?.extra;
    if (pairs === undefined) {
      return;
    }
    for (let pairIndex = 0; pairIndex < pairs.length; pairIndex += 1) {
      const pair = pairs[pairIndex];
      if (pair === undefined) {
        continue;
      }
      let domain = defaultDomain;
      if (pair.algorithm === 'apca') {
        domain = ContrastRatioDomain.apca;
      } else if (pair.algorithm === 'wcag21') {
        domain = ContrastRatioDomain.wcag21;
      }
      ContrastPairBounds.validate(
        {
          ...(pair.maximumContrastRatio === undefined ? {} : { 'maximumContrastRatio': pair.maximumContrastRatio }),
          ...(pair.minimumContrastRatio === undefined ? {} : { 'minimumContrastRatio': pair.minimumContrastRatio })
        },
        domain,
        { 'collectionName': 'extra', 'index': pairIndex, 'inputPath': 'input.contrast' }
      );
    }
  }

  private createState(input: InputInterfaceTypeEntity.Type): PaletteStateInterface {
    const metadata = InputJsonRecord.admit(input.metadata, 'metadata') ?? {};
    const extra = InputJsonRecord.admit(input.runtime?.extra, 'runtime.extra');
    const runtime = RuntimeOptionsInterfaceTypeEntity.create({
      ...(input.runtime?.colorSpace === undefined ? {} : { 'colorSpace': input.runtime.colorSpace }),
      ...(extra === undefined ? {} : { 'extra': extra }),
      ...(input.runtime?.framing === undefined ? {} : { 'framing': input.runtime.framing })
    });
    return {
      'colors': [], 'input': input, 'metadata': metadata, 'outputs': {}, 'roles': {}, 'runtime': runtime,
      'variants': {}
    };
  }

  private createPipelineContext(): PipelineContextInterface {
    return { 'logger': consoleLogger, 'startedAt': Date.now() };
  }

  private resolveSequence(): readonly TaskInterface[] {
    if (this.sequence === null || this.sequenceVersion !== this.tasks.version()) {
      this.sequence = this.order.length > 0
        ? this.resolveOrderedTasks()
        : this.resolveRegisteredTasks();
      this.sequenceVersion = this.tasks.version();
    }
    return this.sequence;
  }

  private resolveOrderedTasks(): readonly TaskInterface[] {
    const result = this.resolveTasks(this.order);
    return result;
  }

  private resolveRegisteredTasks(): readonly TaskInterface[] {
    const manifests = this.tasks.list();
    const result: TaskInterface[] = [];
    for (let index = 0; index < manifests.length; index += 1) {
      const manifest = manifests[index];
      if (manifest !== undefined) {
        result.push(this.tasks.resolve(manifest.name));
      }
    }
    return result;
  }

  private resolveTasks(names: readonly string[]): readonly TaskInterface[] {
    const result: TaskInterface[] = [];
    for (let index = 0; index < names.length; index += 1) {
      const name = names[index];
      if (name !== undefined) {
        result.push(this.tasks.resolve(name));
      }
    }
    return result;
  }

  private runHookTasks(tasks: readonly TaskInterface[], state: PaletteStateInterface, context: PipelineContextInterface): void {
    for (let index = 0; index < tasks.length; index += 1) {
      const task = tasks[index];
      if (task !== undefined) {
        task.run(state, context);
      }
    }
  }

  private runPipelineTasks(tasks: readonly TaskInterface[], state: PaletteStateInterface, context: PipelineContextInterface): void {
    for (let index = 0; index < tasks.length; index += 1) {
      const task = tasks[index];
      if (task !== undefined && task.manifest?.phase === undefined) {
        task.run(state, context);
      }
    }
  }

  private validateState(state: PaletteStateInterface): void {
    const result = this.validator.validate(PaletteStateSchema, state);
    if (result.errors.length > 0) {
      this.throwInvalid('output state invalid', 'state', result.errors);
    }
  }

  private validatePluginSlots(schemas: ReadonlyMap<string, JsonSchemaObjectType>, slots: Record<string, JSONSchema7Type>, namespace: string): void {
    const entries = [...schemas.entries()];
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry === undefined) {
        continue;
      }
      const [slot, schema] = entry;
      const value = slots[slot];
      if (value === undefined) {
        continue;
      }
      const result = this.validator.validate(schema, value);
      if (result.errors.length > 0) {
        this.throwInvalid('failed plugin schema', `${namespace}['${slot}']`, result.errors);
      }
    }
  }

  private throwInvalid(prefix: string, path: string, errors: ValidationErrorInterfaceTypeEntity.Type[]): void {
    if (errors.length === 0) {
      return;
    }
    const first = errors[0];
    const detail = first === undefined ? 'unknown error' : `${first.path}: ${first.message}`;
    throw ValidationError.create({ 'message': `${prefix}: ${detail}`, 'path': path, 'violations': errors });
  }
}
