import type { FromSchema, JsonValueType } from '@studnicky/types';

import { JsonTology } from '@studnicky/json-tology';

/**
 * The minimal shared abstraction for anything that exposes a live, readable
 * progress value `t` in [0, 1] — the normalized position consumed by
 * iridis-anima's `evaluate`/`evaluateStops`. `ClockBinding` (real and
 * virtual variants) implements this. `ValueBinding` does not: it maps an
 * arbitrary external scalar to `t` on demand via `mapToT`, rather than
 * owning a live-updating `t` of its own.
 */
export namespace SignalBindingInterfaceTypeEntity {
  export const Schema = {
    '$id':                 'https://studnicky.dev/iridis-pulse/SignalBinding',
    'additionalProperties': false,
    'properties': {
      't': { 'type': 'number' }
    },
    'required': ['t'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = JsonTology.is(Schema, value);
    return result;
  };
}
