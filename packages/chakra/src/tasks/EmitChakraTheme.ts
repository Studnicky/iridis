import {
  type ColorRecordEntity,
  type PaletteStateInterface,
  type PipelineContextInterface,
  type TaskInterface,
  TaskManifestEntity
} from '@studnicky/iridis';
import { LOG_STATUS, LogBody } from '@studnicky/logger/node';

import type { ChakraOutputEntity } from '../types/index.ts';

import { FAMILY_ROLE_MAP } from './constants/FamilyRoleMap.ts';

/**
 * Picks the role name that actually resolves in `roles`: the primary
 * role if assigned, else the fallback if assigned, else `undefined` so
 * callers can skip the family entirely.
 */
class EffectiveRole {
  static resolve(
    roles: Record<string, ColorRecordEntity.Type>,
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
    roles: Record<string, ColorRecordEntity.Type>,
    variants: Record<string, Record<string, ColorRecordEntity.Type>>,
    effectiveRole: string
  ): Record<string, string> | undefined {
    const light = variants.light?.[effectiveRole];
    const base = roles[effectiveRole];
    const dark = variants.dark?.[effectiveRole];
    const result = {
      ...(light === undefined ? {} : { '100': light.hex }),
      ...(base === undefined ? {} : { '500': base.hex }),
      ...(dark === undefined ? {} : { '900': dark.hex })
    };
    const output = Object.keys(result).length > 0 ? result : undefined;
    return output;
  }
}

/**
 * Serializes the family map to a JSON-compatible JS object literal
 * string, safe to embed in an `extendTheme({ colors: ... })` call.
 */
class ColorsToJs {
  static serialize(colors: ReadonlyMap<string, Record<string, string>>): string {
    const lines: string[] = ['{'];
    const families = Array.from(colors.entries());
    for (let familyIndex = 0; familyIndex < families.length; familyIndex += 1) {
      const entry = families[familyIndex];
      if (entry === undefined) {
        continue;
      }
      const [family, shades] = entry;
      lines.push(`  '${family}': {`);
      const shadeEntries = Object.entries(shades);
      for (let shadeIndex = 0; shadeIndex < shadeEntries.length; shadeIndex += 1) {
        const shadeEntry = shadeEntries[shadeIndex];
        if (shadeEntry === undefined) {
          continue;
        }
        const [shade, hex] = shadeEntry;
        lines.push(`    '${shade}': '${hex}',`);
      }
      lines.push('  },');
    }
    lines.push('}');
    const result = lines.join('\n');
    return result;
  }
}

/**
 * Emit a Chakra UI `extendTheme()`-compatible color-token scale from
 * resolved roles and their `dark`/`light` variants. Registered as the
 * `emit:chakraTheme` pipeline task.
 */
export class EmitChakraTheme implements TaskInterface {
  readonly 'name' = 'emit:chakraTheme';

  readonly 'manifest': TaskManifestEntity.Type = TaskManifestEntity.create({
    'description': 'Emit a Chakra UI extendTheme() color-token scale (100/500/900 per family) from resolved roles and dark/light variants',
    'name':        'emit:chakraTheme',
    'reads':       ['roles', 'variants'],
    'writes':      ['outputs.chakra:theme']
  });

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const colors = new Map<string, Record<string, string>>();
    for (let mappingIndex = 0; mappingIndex < FAMILY_ROLE_MAP.length; mappingIndex += 1) {
      const mapping = FAMILY_ROLE_MAP[mappingIndex];
      if (mapping === undefined) {
        continue;
      }
      const effectiveRole = EffectiveRole.resolve(state.roles, mapping.role, mapping.fallback);
      if (effectiveRole === undefined) {
        continue;
      }
      const family = Family.build(state.roles, state.variants, effectiveRole);
      if (family === undefined) {
        continue;
      }
      colors.set(mapping.family, family);
    }

    const colorsJs = ColorsToJs.serialize(colors);
    const indentedColors = colorsJs.split('\n').map((line, index) => {
      const result = index === 0 ? line : `  ${line}`;
      return result;
    }).join('\n');
    const brand = colors.get('brand');
    const accent = colors.get('accent');
    const success = colors.get('success');
    const warning = colors.get('warning');
    const error = colors.get('error');
    const info = colors.get('info');
    const neutral = colors.get('neutral');
    const colorOutput: Record<string, Record<string, string>> = {
      ...(brand === undefined ? {} : { 'brand': brand }),
      ...(accent === undefined ? {} : { 'accent': accent }),
      ...(success === undefined ? {} : { 'success': success }),
      ...(warning === undefined ? {} : { 'warning': warning }),
      ...(error === undefined ? {} : { 'error': error }),
      ...(info === undefined ? {} : { 'info': info }),
      ...(neutral === undefined ? {} : { 'neutral': neutral })
    };
    const config = [
      'import { extendTheme } from \'@chakra-ui/react\';',
      '',
      'export default extendTheme({',
      `  colors: ${indentedColors},`,
      '});'
    ].join('\n');

    const output: ChakraOutputEntity = {
      'colors': colorOutput,
      'config': config
    };

    state.outputs['chakra:theme'] = output;

    context.logger.debug(
      LogBody.create({
        'component': 'EmitChakraTheme',
        'context': { 'families': colors.size },
        'message': 'Emitted Chakra theme',
        'operation': 'run',
        'status': LOG_STATUS.SUCCESS
      })
    );
  }
}
