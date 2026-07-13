/**
 * Token-derivation parameters for VS Code semantic tokens.
 *
 * Domain: theming. Parameters describe HSL deltas applied to derive each
 * token type from its family root color. Data literals live in
 * `data/derivationParams.ts`.
 */

import type { InferType } from '@studnicky/json-tology/types';

export const DerivationParamsSchema = {
  '$id': 'https://studnicky.dev/iridis-vscode/DerivationParams',
  'additionalProperties': false,
  'properties': {
    'hue':   { 'type': 'number' },
    'light': { 'type': 'number' },
    'sat':   { 'type': 'number' }
  },
  'type': 'object'
} as const;

export type DerivationParamsInterfaceType = {
  'hue'?: number;
  'light'?: number;
  'sat'?: number;
};

/** Schema-derived type for derivation parameters (validation shape). */
export type DerivationParamsSchemaType = InferType<typeof DerivationParamsSchema>;
