/**
 * Constants used by `EmitTailwindTheme` to group resolved roles into
 * Tailwind shade scales.
 */
export const EMIT_TAILWIND_THEME_CONSTANTS = {
  /** Matches roles following the `<root>-<shade>` pattern where shade is numeric. */
  'shadeRolePattern': /^(.+)-(\d+)$/,
  /** Standard Tailwind shade values (50-950). Used to validate shade grouping. */
  'tailwindShades': new Set([
    '50', '100', '150', '200', '250', '300', '350', '400',
    '450', '500', '550', '600', '650', '700', '750', '800',
    '850', '900', '950'
  ])
} as const;
