/**
 * Output shape of {@link import('../quickPalette.ts').quickPalette}: the
 * four canonical roles, each resolved to a 6-digit hex string. Frozen by
 * convention: callers read; the engine writes.
 */
export type QuickPaletteInterfaceType = {
  'accent':     string;
  'background': string;
  'foreground': string;
  'muted':      string;
};
