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

/**
 * `metadata['core:hueOffsetOverrides']`: per-role `hueOffset` override,
 * keyed by role name, consulted by `expand:family` in place of the
 * schema's own `hueOffset` for that role. `state.input` stays immutable —
 * any task (site-specific or otherwise) that needs to compute a role's
 * derivation hue writes here instead of mutating the schema, keeping the
 * override visible to and produced by the registered pipeline rather than
 * pre-processing the schema outside it.
 */
export type HueOffsetOverrideMapInterfaceType = Record<string, number>;

/** One role's absolute-hue-target override — see `core:hueTargetOverrides`. */
export type HueTargetOverrideInterfaceType = {
  'hue':       number;
  'hueClamp': number | undefined;
};

/**
 * `metadata['core:hueTargetOverrides']`: per-role absolute `hue`/`hueClamp`
 * override, keyed by role name, consulted by both `resolve:roles` (for a
 * directly-resolved role) and `expand:family` (for a derived role) in place
 * of the schema's own `hue`/`hueClamp` for that role. Same rationale as
 * `core:hueOffsetOverrides` — a task computes it, `state.input` stays
 * immutable.
 */
export type HueTargetOverrideMapInterfaceType = Record<string, HueTargetOverrideInterfaceType>;

/** Known `state.metadata` keys written by core tasks, and their runtime shapes. */
export type EngineMetadataInterfaceType = {
  'core:hueOffsetOverrides': HueOffsetOverrideMapInterfaceType | undefined;
  'core:hueTargetOverrides': HueTargetOverrideMapInterfaceType | undefined;
  'core:roleClamps':         RoleClampMapInterfaceType | undefined;
  'core:roleDistances':      RoleDistanceMapInterfaceType | undefined;
  'core:rolesDerived':       string[] | undefined;
  'core:rolesPinned':        string[] | undefined;
  'core:rolesSynthesized':   string[] | undefined;
};

/** Type-safe accessor for a known `state.metadata` key, returning `undefined` when unset. */
export function getEngineMetadata<K extends keyof EngineMetadataInterfaceType>(
  metadata: Record<string, unknown>,
  key: K
): EngineMetadataInterfaceType[K] {
  const result = metadata[key] as EngineMetadataInterfaceType[K];
  return result;
}
