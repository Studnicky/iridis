/**
 * VS Code semantic-token modifier transforms.
 *
 * Domain: theming. Transforms describe per-modifier deltas
 * (lightness/saturation/font-style) applied on top of a token's base color.
 * Data literals live in `data/modifierTransforms.ts`.
 */

export type FontStyleType = 'bold' | 'bold italic' | 'italic' | 'strikethrough' | 'underline';

export type ModifierTransformInterfaceType = {
  'fontStyle'?: FontStyleType;
  'lightness'?: number;
  'mixWeight'?: number;
  /** Role name to mix toward: 'muted' | 'constant' | 'warning' | 'comment' | 'info' */
  'mixWith'?: string;
  'saturation'?: number;
};
