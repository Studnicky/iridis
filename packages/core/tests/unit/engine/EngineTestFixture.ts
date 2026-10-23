import type { LogRecordEntity } from '@studnicky/logger/entities';
import type { JSONSchema7Type } from 'json-schema';

import type { ColorInputEntity } from '../../../src/entities/ColorInputEntity.ts';
import type { ContrastOptionsEntity } from '../../../src/entities/ContrastOptionsEntity.ts';
import type { RoleSchemaEntity } from '../../../src/entities/RoleSchemaEntity.ts';
import type { RuntimeOptionsEntity } from '../../../src/entities/RuntimeOptionsEntity.ts';
import type { PaletteStateInterface } from '../../../src/interfaces/PaletteStateInterface.ts';
import type { PipelineContextInterface } from '../../../src/interfaces/PipelineContextInterface.ts';
import type { PluginInterface } from '../../../src/interfaces/PluginInterface.ts';
import type { TaskInterface } from '../../../src/interfaces/TaskInterface.ts';

import { InputEntity } from '../../../src/entities/InputEntity.ts';
import { TaskManifestEntity } from '../../../src/entities/TaskManifestEntity.ts';

interface EngineInputOverridesInterface {
  readonly 'colors'?: readonly ColorInputEntity.Type[];
  readonly 'contrast'?: ContrastOptionsEntity.Type;
  readonly 'emit'?: readonly string[];
  readonly 'maximumColorCount'?: number;
  readonly 'metadata'?: Readonly<Record<string, JSONSchema7Type>>;
  readonly 'roles'?: RoleSchemaEntity.Type;
  readonly 'runtime'?: RuntimeOptionsEntity.Type;
}

class WarningCaptureSession {
  readonly 'warnings': string[] = [];

  private readonly consoleReference: Console;
  private readonly originalWarn: Console['warn'];

  constructor() {
    this.consoleReference = console;
    this.originalWarn = this.consoleReference.warn;
    this.consoleReference.warn = (message: string, _record: LogRecordEntity.Type): void => {
      this.warnings.push(message);
    };
  }

  restore(): void {
    this.consoleReference.warn = this.originalWarn;
  }
}

export class EngineTestFixture {
  static captureWarnings(): WarningCaptureSession {
    return new WarningCaptureSession();
  }

  static makeInput(extra: EngineInputOverridesInterface = {}): InputEntity.Type {
    const result = InputEntity.intake({
      ...extra,
      'colors': [...(extra.colors ?? ['#ff0000'])]
    });
    return result;
  }

  static malformedSchemaType(type: JSONSchema7Type): { readonly 'type': JSONSchema7Type } {
    const result = { 'type': type };
    return result;
  }

  static makePluginWithEmptySchemas(name: string): PluginInterface {
    const schemas = (): ReturnType<Exclude<PluginInterface['schemas'], undefined>> => { return {}; };
    const tasks = (): readonly TaskInterface[] => { return []; };
    const result = { 'name': name, 'schemas': schemas, 'tasks': tasks, 'version': '0.0.1' };
    return result;
  }

  static makePlugin(name: string, tasks: readonly TaskInterface[]): PluginInterface {
    const listTasks = (): readonly TaskInterface[] => { return [...tasks]; };
    return {
      'name': name,
      'tasks': listTasks,
      'version': '0.0.1'
    };
  }

  static makeTask(
    name: string,
    options?: {
      'onRun'?: (state: PaletteStateInterface, context: PipelineContextInterface) => void;
      'requires'?: string[];
    }
  ): TaskInterface {
    const run = (state: PaletteStateInterface, context: PipelineContextInterface): void => {
      options?.onRun?.(state, context);
    };
    const result = {
      'manifest': TaskManifestEntity.create({
        'name': name,
        ...(options?.requires === undefined ? {} : { 'requires': options.requires })
      }),
      'name': name,
      'run': run
    };
    return result;
  }

  static makeRunEndTask(
    name: string,
    onRun?: (state: PaletteStateInterface, context: PipelineContextInterface) => void
  ): TaskInterface {
    const run = (state: PaletteStateInterface, context: PipelineContextInterface): void => {
      onRun?.(state, context);
    };
    const result = {
      'manifest': TaskManifestEntity.create({ 'name': name, 'phase': 'onRunEnd' }),
      'name': name,
      'run': run
    };
    return result;
  }

  static makeRunStartTask(
    name: string,
    onRun?: (state: PaletteStateInterface, context: PipelineContextInterface) => void
  ): TaskInterface {
    const run = (state: PaletteStateInterface, context: PipelineContextInterface): void => {
      onRun?.(state, context);
    };
    const result = {
      'manifest': TaskManifestEntity.create({ 'name': name, 'phase': 'onRunStart' }),
      'name': name,
      'run': run
    };
    return result;
  }
}
