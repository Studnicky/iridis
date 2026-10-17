import type { InferType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Canonical classification for a Tailwind scenario-matrix row. */
export namespace ScenarioClassificationEntity {
  export const Schema = {
    '$id': 'https://studnicky.dev/iridis-tailwind/test-scenario-classification',
    'enum': ['happy', 'edge', 'unhappy'],
    'type': 'string'
  } as const;

  export type Type = InferType<typeof Schema>;

  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const validate = EntityCompiler.compile<Type>(Schema);
}
