/** Regex patterns matched by `intake:p3` against CSS Color 4 `color(display-p3 …)` strings. */
export const P3_PATTERNS = {
  /**
   * Matches CSS Color 4 `color(display-p3 r g b)` and
   * `color(display-p3 r g b / alpha)` syntax. Channel values are 0..1
   * floats. Alpha is optional. Whitespace tolerant.
   *
   * Captures: `[1] r`, `[2] g`, `[3] b`, `[4] alpha?` (the slash-prefixed group).
   */
  'DISPLAY_P3': /^color\(\s*display-p3\s+(-?\d*\.?\d+)\s+(-?\d*\.?\d+)\s+(-?\d*\.?\d+)(?:\s*\/\s*(-?\d*\.?\d+))?\s*\)$/i
} as const;
