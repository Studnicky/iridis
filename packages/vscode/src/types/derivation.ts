/**
 * Token-derivation parameters for VS Code semantic tokens.
 *
 * Domain: theming. Parameters describe HSL deltas applied to derive each
 * token type from its family root color. Data literals live in
 * `data/derivationParams.ts`.
 */

export interface DerivationParamsInterface {
  readonly 'hue'?: number;
  readonly 'sat'?: number;
  readonly 'light'?: number;
}
