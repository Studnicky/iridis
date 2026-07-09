import type {
  PaletteStateInterface, PipelineContextInterface, RoleDefinitionInterfaceType, TaskInterface, TaskManifestInterfaceType
} from '@studnicky/iridis/types';

import { colorRecordFactory } from '@studnicky/iridis';

function clampToRange(value: number, range: readonly [number, number]): number {
  if (value < range[0]) {return range[0];}
  if (value > range[1]) {return range[1];}
  return value;
}

/**
 * Nudges a pinned candidate's lightness/chroma into the role's declared range
 * (so a pin stays legible against contrast checks) but keeps the candidate's
 * OWN hue — unlike ExpandFamily's derivation, pinning is the user overriding
 * the schema's hue-rotation on purpose, so the hue is exactly what they picked.
 */
function nudgeKeepingHue(hex: string, role: RoleDefinitionInterfaceType) {
  const candidate = colorRecordFactory.fromHex(hex);
  const { c, h, l } = candidate.oklch;
  const targetL = role.lightnessRange !== undefined ? clampToRange(l, role.lightnessRange) : l;
  const targetC = role.chromaRange !== undefined ? clampToRange(c, role.chromaRange) : c;
  return colorRecordFactory.fromOklch(targetL, targetC, h, { 'alpha': candidate.alpha });
}

/**
 * ResolveRoles skips every role with `derivedFrom` set (the FIRST check in its
 * loop, before it ever looks at hints), so a seed pinned to a schema-derived
 * role like `warning`/`success`/`info`/`accent-alt` — which is exactly what
 * this site's own demo showcases as Nuxt UI's colored buttons/badges/spectrum
 * cards — never got resolved from that hint at all. ExpandFamily then always
 * derives it from `brand` by hue rotation, silently discarding the pin.
 *
 * This task runs between resolve:roles and expand:family and does what
 * ResolveRoles would have done for a hint match, for derived roles only.
 * ExpandFamily's own rule — "already-assigned roles are left alone; explicit
 * input wins over family derivation" — then protects this assignment.
 */
class PinDerivedRoles implements TaskInterface {
  readonly 'name' = 'pin:derivedRoles';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Assigns hint-pinned colors onto derivedFrom roles that ResolveRoles skipped, so a pin overrides hue-rotation instead of being silently discarded by ExpandFamily.',
    'name':        'pin:derivedRoles',
    'reads':       ['colors', 'input.roles', 'roles'],
    'writes':      ['roles']
  };

  run(state: PaletteStateInterface, _ctx: PipelineContextInterface): void {
    if (state.input.roles === undefined) {return;}
    for (const role of state.input.roles.roles) {
      if (role.derivedFrom === undefined || role.derivedFrom === '') {continue;}
      if (state.roles[role.name] !== undefined) {continue;}
      const hintMatch = state.colors.find((c) => {return c.hints?.role === role.name;});
      if (hintMatch === undefined) {continue;}
      state.roles[role.name] = nudgeKeepingHue(hintMatch.hex, role);
    }
  }
}

/** Singleton instance registered wherever the color pipeline runs (useIridis.ts, MultiOutput.vue). */
export const pinDerivedRoles = new PinDerivedRoles();
