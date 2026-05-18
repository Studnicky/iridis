/**
 * Token-derivation parameters for VS Code semantic tokens.
 *
 * Domain: theming. Parameters describe HSL deltas applied to derive each
 * token type from its family root color. Data literals live in
 * `data/derivationParams.ts`.
 */

import type { FromSchema } from 'json-schema-to-ts';

export const DerivationParamsSchema = {
  'type': 'object',
  'additionalProperties': false,
  'properties': {
    'hue':   { 'type': 'number' },
    'sat':   { 'type': 'number' },
    'light': { 'type': 'number' },
  },
} as const;

export interface DerivationParamsInterface {
  readonly 'hue'?: number;
  readonly 'sat'?: number;
  readonly 'light'?: number;
}

/** Schema-derived type for derivation parameters (validation shape). */
export type DerivationParamsSchemaType = FromSchema<typeof DerivationParamsSchema>;
