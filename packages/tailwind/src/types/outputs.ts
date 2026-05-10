/**
 * Tailwind plugin output shape.
 *
 * Describes the slot written into `state.outputs.tailwind` by
 * `emit:tailwindTheme`.
 */

export interface TailwindOutputInterface {
  readonly 'colors':  Record<string, string | Record<string, string>>;
  readonly 'cssVars': string;
  readonly 'config':  string;
}
