import type {
  ColorRecordInterfaceType,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterfaceType
} from '@studnicky/iridis';

import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import type { ChakraOutputInterfaceType } from '../types/index.ts';

/**
 * Chakra shade tier each data source maps to. The engine has no
 * numeric-shade generator (no `s50`..`s900` scale) — the only per-role
 * color data available is the canonical resolved role
 * (`state.roles`) and the `dark`/`light` framings produced by
 * `derive:variant` (`state.variants['dark' | 'light']`). This maps
 * those three sources onto a minimal three-tier Chakra scale.
 */
const TIER_SOURCES: readonly { 'source': 'roles' | 'dark' | 'light'; 'tier': string }[] = [
  { 'source': 'light', 'tier': '100' },
  { 'source': 'roles', 'tier': '500' },
  { 'source': 'dark',  'tier': '900' }
];

/**
 * Chakra color-family name → resolved-role mapping, with an optional
 * fallback role consulted when the primary role never resolves. Order
 * mirrors Chakra's semantic palette conventions (brand first, neutral
 * last).
 */
const FAMILY_ROLE_MAP: readonly { 'fallback'?: string; 'family': string; 'role': string }[] = [
  { 'family': 'brand', 'role': 'brand' },
  { 'fallback': 'brand', 'family': 'accent', 'role': 'accent-alt' },
  { 'fallback': 'brand', 'family': 'success', 'role': 'success' },
  { 'fallback': 'brand', 'family': 'warning', 'role': 'warning' },
  { 'family': 'error', 'role': 'error' },
  { 'fallback': 'brand', 'family': 'info', 'role': 'info' },
  { 'fallback': 'text', 'family': 'neutral', 'role': 'muted' }
];

/**
 * Picks the role name that actually resolves in `roles`: the primary
 * role if assigned, else the fallback if assigned, else `undefined` so
 * callers can skip the family entirely.
 */
class EffectiveRole {
  static resolve(
    roles: Record<string, ColorRecordInterfaceType>,
    role: string,
    fallback?: string
  ): string | undefined {
    if (roles[role] !== undefined) {return role;}
    if (fallback !== undefined && roles[fallback] !== undefined) {return fallback;}
    return undefined;
  }
}

/**
 * Builds a tier→hex map (Chakra's color-family convention) for one role
 * from the canonical resolved role and its `dark`/`light` framings. A
 * tier is omitted when its source has no color for the role rather than
 * backfilled; the family is dropped entirely (returns `undefined`) when
 * none of the sources resolve, since an empty family is not useful
 * output.
 */
class Family {
  static build(
    roles: Record<string, ColorRecordInterfaceType>,
    variants: Record<string, Record<string, ColorRecordInterfaceType>>,
    effectiveRole: string
  ): Record<string, string> | undefined {
    const family: Record<string, string> = {};

    for (const { source, tier } of TIER_SOURCES) {
      const roleColor = source === 'roles' ? roles[effectiveRole] : variants[source]?.[effectiveRole];
      if (roleColor !== undefined) {
        family[tier] = roleColor.hex;
      }
    }

    return Object.keys(family).length > 0 ? family : undefined;
  }
}

/**
 * Serializes the family map to a JSON-compatible JS object literal
 * string, safe to embed in an `extendTheme({ colors: ... })` call.
 */
class ColorsToJs {
  static serialize(colors: Record<string, Record<string, string>>): string {
    const lines: string[] = ['{'];
    for (const [family, shades] of Object.entries(colors)) {
      lines.push(`  '${family}': {`);
      for (const [shade, hex] of Object.entries(shades)) {
        lines.push(`    '${shade}': '${hex}',`);
      }
      lines.push('  },');
    }
    lines.push('}');
    return lines.join('\n');
  }
}

/**
 * Emit a Chakra UI `extendTheme()`-compatible color-token scale from
 * resolved roles and their `dark`/`light` variants. Registered as the
 * `emit:chakraTheme` pipeline task.
 */
export class EmitChakraTheme implements TaskInterface {
  readonly 'name' = 'emit:chakraTheme';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Emit a Chakra UI extendTheme() color-token scale (100/500/900 per family) from resolved roles and dark/light variants',
    'name':        'emit:chakraTheme',
    'phase':       undefined,
    'reads':       ['roles', 'variants'],
    'requires':    undefined,
    'writes':      ['outputs.chakra:theme']
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const colors: Record<string, Record<string, string>> = {};

    for (const mapping of FAMILY_ROLE_MAP) {
      const effectiveRole = EffectiveRole.resolve(state.roles, mapping.role, mapping.fallback);
      if (effectiveRole === undefined) {continue;}

      const family = Family.build(state.roles, state.variants, effectiveRole);
      if (family === undefined) {continue;}

      colors[mapping.family] = family;
    }

    const colorsJs = ColorsToJs.serialize(colors);
    const config = [
      'import { extendTheme } from \'@chakra-ui/react\';',
      '',
      'export default extendTheme({',
      `  colors: ${colorsJs.split('\n').map((l, i) => {return i === 0 ? l : `  ${l}`;}).join('\n')},`,
      '});'
    ].join('\n');

    const output: ChakraOutputInterfaceType = {
      'colors': colors,
      'config': config
    };

    state.outputs['chakra:theme'] = output;

    ctx.logger.debug(
      LogBody.create()
        .component('EmitChakraTheme')
        .operation('run')
        .status(LOG_STATUS.SUCCESS)
        .message('Emitted Chakra theme')
        .context({ 'families': Object.keys(colors).length })
        .build()
    );
  }
}
