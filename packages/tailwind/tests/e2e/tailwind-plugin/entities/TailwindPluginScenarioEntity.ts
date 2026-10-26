import type { PaletteStateInterface } from '@studnicky/iridis';
import type { TailwindOutputInterface } from '@studnicky/iridis-tailwind';
import type { InferType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { Engine, InputEntity, RoleSchemaEntity } from '@studnicky/iridis';
import { tailwindPlugin } from '@studnicky/iridis-tailwind';
import { coreTasks } from '@studnicky/iridis/tasks';

export namespace TailwindPluginScenarioEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'theme': {
        'additionalProperties': false,
        'properties': {
          'colors': {
            'additionalProperties': {
              'oneOf': [
                { 'type': 'string' },
                { 'additionalProperties': { 'type': 'string' }, 'type': 'object' }
              ]
            },
            'type': 'object'
          },
          'config': { 'type': 'string' },
          'cssVars': { 'type': 'string' }
        },
        'required': ['colors', 'config', 'cssVars'],
        'type': 'object'
      }
    },
    'required': ['theme'],
    'type': 'object'
  } as const;

  export type Type = InferType<typeof Schema>;

  export interface InputInterface {
    readonly 'colors': InputEntity.Type['colors'];
    readonly 'contrast'?: InputEntity.Type['contrast'];
    readonly 'emit'?: InputEntity.Type['emit'];
    readonly 'metadata'?: InputEntity.Type['metadata'];
    readonly 'roles'?: RoleSchemaEntity.Type;
    readonly 'runtime'?: InputEntity.Type['runtime'];
  }

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);

  export class Factory {
    static createEngine(): Engine {
      const engine = new Engine();
      for (let index = 0; index < coreTasks.length; index += 1) {
        const task = coreTasks[index];
        if (task !== undefined) {
          engine.tasks.register(task);
        }
      }
      engine.adopt(tailwindPlugin);
      return engine;
    }

    static createInput(value: InputInterface): InputEntity.Type {
      const result = InputEntity.create({
        'colors': value.colors,
        ...(value.contrast === undefined ? {} : { 'contrast': value.contrast }),
        ...(value.emit === undefined ? {} : { 'emit': value.emit }),
        ...(value.metadata === undefined ? {} : { 'metadata': value.metadata }),
        ...(value.roles === undefined ? {} : { 'roles': value.roles }),
        ...(value.runtime === undefined ? {} : { 'runtime': value.runtime })
      });
      return result;
    }

    static createRoleSchema(
      roleNames: readonly string[],
      options: { 'chromaRange'?: [number, number]; 'lightnessRange'?: [number, number]; } = {}
    ): RoleSchemaEntity.Type {
      const result = RoleSchemaEntity.intake({
        'contrastPairs': undefined,
        'description': undefined,
        'name': 'test-schema',
        'roles': roleNames.map((name) => {return {
          'chromaRange': options.chromaRange,
          'description': undefined,
          'intent': undefined,
          'lightnessRange': options.lightnessRange,
          'name': name,
          'required': true
        };})
      });
      return result;
    }

    static outputFrom(state: PaletteStateInterface): TailwindOutputInterface {
      const result = intake({ 'theme': state.outputs['tailwind:theme'] });
      return result.theme;
    }
  }
}
