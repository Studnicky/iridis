import type { QuickPaletteInterfaceTypeEntity } from '../entities/QuickPaletteInterfaceTypeEntity.ts';

/**
 * Output shape of {@link import('../QuickPalette.ts').QuickPalette.resolve}: the
 * four canonical roles, each resolved to a 6-digit hex string. Frozen by
 * convention: callers read; the engine writes.
 */
export type QuickPaletteInterfaceType = QuickPaletteInterfaceTypeEntity.Type;
