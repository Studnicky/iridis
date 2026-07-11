import type { OklchInterfaceType } from './color.ts';

/** One clamp record written by `resolve:roles` when a seed color is nudged into a role's declared ranges. */
export type RoleClampInterfaceType = {
  'resolvedHex':   string;
  'resolvedOklch': OklchInterfaceType;
  'seedHex':       string;
  'seedOklch':     OklchInterfaceType;
};

/** `metadata['core:roleClamps']`: per-role clamp record, keyed by role name. */
export type RoleClampMapInterfaceType = Record<string, RoleClampInterfaceType>;

/** `metadata['core:roleDistances']`: per-role OKLCH distance to each candidate color's hex, keyed by role name. */
export type RoleDistanceMapInterfaceType = Record<string, Record<string, number>>;

/** Known `state.metadata` keys written by core tasks, and their runtime shapes. */
export interface EngineMetadataInterfaceType {
  'core:roleClamps'?:        RoleClampMapInterfaceType;
  'core:roleDistances'?:     RoleDistanceMapInterfaceType;
  'core:rolesDerived'?:      string[];
  'core:rolesPinned'?:       string[];
  'core:rolesSynthesized'?:  string[];
}

/** Type-safe accessor for a known `state.metadata` key, returning `undefined` when unset. */
export function getEngineMetadata<K extends keyof EngineMetadataInterfaceType>(
  metadata: Record<string, unknown>,
  key: K
): EngineMetadataInterfaceType[K] {
  return metadata[key] as EngineMetadataInterfaceType[K];
}
