/**
 * OKLCH lightness deltas used to derive `light`/`dark` shade steps from a
 * role's canonical color when no explicit `s300`/`s700` variant is present.
 * Mirrors MUI's own `createPalette` tonal-offset convention (`lighten(main,
 * 0.2)` / `darken(main, 0.3)`, the default `tonalOffset`), so an unconfigured
 * pipeline still emits shades that read as MUI-native.
 */
export const DERIVED_SHADE_OFFSETS = {
  'dark':  0.3,
  'light': 0.2
} as const;
