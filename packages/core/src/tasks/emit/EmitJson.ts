import { LOG_STATUS, LogBody } from '@studnicky/logger/node';

import type { ColorRecordEntity } from '../../entities/ColorRecordEntity.ts';
import type { JsonOutputEntity } from '../../entities/JsonOutputEntity.ts';
import type { PaletteStateInterface } from '../../interfaces/PaletteStateInterface.ts';
import type { PipelineContextInterface } from '../../interfaces/PipelineContextInterface.ts';
import type { TaskInterface } from '../../interfaces/TaskInterface.ts';

import { TaskManifestEntity } from '../../entities/TaskManifestEntity.ts';

class JsonOutputProjection {
  static #recordFromEntries<ValueType>(entries: Iterable<readonly [string, ValueType]>): Record<string, ValueType> {
    const result: Record<string, ValueType> = {};
    for (const [name, value] of entries) {
      Object.defineProperty(result, name, { 'configurable': true, 'enumerable': true, 'value': value, 'writable': true });
    }
    return result;
  }

  static roles(source: Record<string, ColorRecordEntity.Type>): Record<string, string> {
    const sourceEntries = Object.entries(source);
    const result = new Map<string, string>();
    for (let index = 0; index < sourceEntries.length; index += 1) {
      const entry = sourceEntries.at(index);
      if (entry !== undefined) {
        const [name, color] = entry;
        result.set(name, color.hex);
      }
    }
    const serialized = JsonOutputProjection.#recordFromEntries(result);
    return serialized;
  }

  static variants(source: Record<string, Record<string, ColorRecordEntity.Type>>): Record<string, Record<string, string>> {
    const sourceEntries = Object.entries(source);
    const result = new Map<string, Record<string, string>>();
    for (let index = 0; index < sourceEntries.length; index += 1) {
      const entry = sourceEntries.at(index);
      if (entry !== undefined) {
        const [name, roles] = entry;
        result.set(name, JsonOutputProjection.roles(roles));
      }
    }
    const serialized = JsonOutputProjection.#recordFromEntries(result);
    return serialized;
  }
}

/**
 * Pipeline task that flattens the rich `ColorRecord` state into a plain
 * `{colors, roles, variants}` object of hex strings at
 * `state.outputs['core:json']`. The lowest-common-denominator output: anything
 * that can read JSON can consume it, with no knowledge of the OKLCH /
 * Display P3 enrichments still present on the original records.
 */
class EmitJson implements TaskInterface {
  readonly 'name' = 'emit:json';

  readonly 'manifest': TaskManifestEntity.Type = TaskManifestEntity.create({
    'description': 'Writes state.outputs[\'core:json\'] with {colors, roles, variants} flattened to hex strings.',
    'name':        'emit:json',
    'reads':       ['colors', 'roles', 'variants'],
    'writes':      ['outputs[\'core:json\']']
  });

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const colors = state.colors.map((color: ColorRecordEntity.Type): string => { return color.hex; });
    const roles = JsonOutputProjection.roles(state.roles);
    const variants = JsonOutputProjection.variants(state.variants);
    const output: JsonOutputEntity.Type = { 'colors': colors, 'roles': roles, 'variants': variants };
    state.outputs['core:json'] = output;

    context.logger.debug(
      LogBody.create({
        'component': 'EmitJson',
        'context': {
          'colors':   colors.length,
          'roles':    roles.size,
          'variants': variants.size
        },
        'message': 'Wrote json output',
        'operation': 'run',
        'status': LOG_STATUS.SUCCESS
      })
    );
  }
}

/** Singleton instance registered as the `emit:json` pipeline task. */
export const emitJson = new EmitJson();
