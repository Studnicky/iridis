import type {
  ColorRecordInterfaceTypeEntity,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface
} from '@studnicky/iridis';

import { TaskManifestInterfaceTypeEntity } from '@studnicky/iridis';
import { LOG_STATUS, LogBody } from '@studnicky/logger/node';

import { PandaOutputInterfaceTypeEntity } from '../entities/PandaOutputInterfaceTypeEntity.ts';

/**
 * Token name → ordered candidate role names. Panda and UnoCSS both
 * consume the same flat semantic palette, so a single mapping table
 * feeds both serializers below. Each token tries its candidates in
 * order and takes the first role present in `state.roles`; a token is
 * omitted entirely when none of its candidates resolve, same defensive
 * fallback pattern as the site's `Tokens.ts` `ALIAS_SOURCE`.
 */
const TOKEN_SOURCE = new Map<string, readonly string[]>([
  ['background', ['background']], ['border', ['border', 'divider', 'muted']], ['error', ['error']],
  ['info', ['info', 'brand']], ['primary', ['brand']], ['secondary', ['accent-alt', 'brand']],
  ['success', ['success', 'brand']], ['surface', ['surface', 'bg-soft', 'background']],
  ['text', ['text']], ['textMuted', ['text-subtle', 'muted', 'text']], ['warning', ['warning', 'brand']]
]);

class TokenColors {
  static build(roles: Record<string, ColorRecordInterfaceTypeEntity.Type>): Map<string, string> {
    const resolvedRoles = new Map(Object.entries(roles));
    const colors = new Map<string, string>();
    for (const [token, candidates] of TOKEN_SOURCE) {
      const hex = TokenColors.firstHex(candidates, resolvedRoles);
      if (hex !== undefined) {
        colors.set(token, hex);
      }
    }
    return colors;
  }

  static output(colors: ReadonlyMap<string, string>): PandaOutputInterfaceTypeEntity.Type['colors'] {
    const result: PandaOutputInterfaceTypeEntity.Type['colors'] = {};
    const background = colors.get('background');
    const border = colors.get('border');
    const error = colors.get('error');
    const info = colors.get('info');
    const primary = colors.get('primary');
    const secondary = colors.get('secondary');
    const success = colors.get('success');
    const surface = colors.get('surface');
    const text = colors.get('text');
    const textMuted = colors.get('textMuted');
    const warning = colors.get('warning');
    if (background !== undefined) { result.background = background; }
    if (border !== undefined) { result.border = border; }
    if (error !== undefined) { result.error = error; }
    if (info !== undefined) { result.info = info; }
    if (primary !== undefined) { result.primary = primary; }
    if (secondary !== undefined) { result.secondary = secondary; }
    if (success !== undefined) { result.success = success; }
    if (surface !== undefined) { result.surface = surface; }
    if (text !== undefined) { result.text = text; }
    if (textMuted !== undefined) { result.textMuted = textMuted; }
    if (warning !== undefined) { result.warning = warning; }
    return result;
  }


  private static firstHex(candidates: readonly string[], roles: ReadonlyMap<string, ColorRecordInterfaceTypeEntity.Type>): string | undefined {
    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = candidates[index];
      const role = candidate === undefined ? undefined : roles.get(candidate);
      if (role !== undefined) {
        return role.hex;
      }
    }
    return undefined;
  }
}

class PandaConfigModule {
  static serialize(colors: ReadonlyMap<string, string>): string {
    const lines: string[] = ['export default defineConfig({', '  theme: {', '    extend: {', '      tokens: {', '        colors: {'];
    for (const [name, hex] of colors) {
      lines.push(`          '${name}': { value: '${hex}' },`);
    }
    lines.push('        },', '      },', '    },', '  },', '});');
    const result = lines.join('\n');
    return result;
  }
}

class UnoConfigModule {
  static serialize(colors: ReadonlyMap<string, string>): string {
    const lines: string[] = ['export default defineConfig({', '  theme: {', '    colors: {'];
    for (const [name, hex] of colors) {
      lines.push(`      '${name}': '${hex}',`);
    }
    lines.push('    },', '  },', '});');
    const result = lines.join('\n');
    return result;
  }
}

/**
 * Emit a Panda CSS token config and a UnoCSS-compatible theme object
 * from the same resolved-role color map. Registered as the
 * `emit:pandaTheme` pipeline task.
 */
export class EmitPandaTheme implements TaskInterface {
  readonly 'name' = 'emit:pandaTheme';

  readonly 'manifest' = TaskManifestInterfaceTypeEntity.create({
    'description': 'Emit Panda CSS token config and a UnoCSS-compatible theme object from the same resolved-role color map',
    'name':        'emit:pandaTheme',
    'reads':       ['roles'],
    'writes':      ['outputs.panda:theme']
  });

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const colors = TokenColors.build(state.roles);

    const pandaConfig = PandaConfigModule.serialize(colors);
    const unoConfig   = UnoConfigModule.serialize(colors);
    const outputColors = TokenColors.output(colors);

    const output = PandaOutputInterfaceTypeEntity.create({
      'colors':      outputColors,
      'pandaConfig': pandaConfig,
      'unoConfig':   unoConfig
    });

    state.outputs['panda:theme'] = output;

    context.logger.debug(
      LogBody.create({
        'component': 'EmitPandaTheme',
        'context': { 'tokens': colors.size },
        'message': 'Emitted Panda/UnoCSS theme',
        'operation': 'run',
        'status': LOG_STATUS.SUCCESS
      })
    );
  }
}
