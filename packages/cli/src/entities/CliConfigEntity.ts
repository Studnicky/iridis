import type { InputEntity } from '@studnicky/iridis';
import type { NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

import { CliConfigSchema } from '../CliConfigSchema.ts';

/** CLI configuration with an admitted canonical engine input. */
export namespace CliConfigEntity {
  export const Schema = { ...CliConfigSchema } as const;

  export type Type = NominalSchemaType<typeof Schema> & { 'input': InputEntity.Type };

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
