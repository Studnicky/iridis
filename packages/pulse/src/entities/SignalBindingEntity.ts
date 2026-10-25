import type { InferType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/**
 * The minimal shared abstraction for anything that exposes a live, readable
 * progress value `t` in [0, 1] — the normalized position consumed by
 * iridis-anima's `evaluate`/`evaluateStops`. `ClockBinding` (real and
 * virtual variants) implements this. `ValueBinding` does not: it maps an
 * arbitrary external scalar to `t` on demand via `mapToT`, rather than
 * owning a live-updating `t` of its own.
 */
export namespace SignalBindingEntity {
  export const Schema = {
    '$id':                 'https://studnicky.dev/iridis-pulse/SignalBinding',
    'additionalProperties': false,
    'properties': {
      't': { 'type': 'number' }
    },
    'required': ['t'],
    'type': 'object'
  } as const;

  export type Type = InferType<typeof Schema>;

  export const validate: ReturnType<typeof EntityCompiler.compile<Type>> = EntityCompiler.compile<Type>(Schema);
  export const intake: ReturnType<typeof EntityCompiler.compileIntake<Type>> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: ReturnType<typeof EntityCompiler.compileCreate<Type>> = EntityCompiler.compileCreate<Type>(Schema);
}
