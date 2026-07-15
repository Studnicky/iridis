import type {
  ColorRecordInterfaceType,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterfaceType
} from '@studnicky/iridis';

import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import type { PandaOutputInterfaceType } from '../types/index.ts';

/**
 * Token name → ordered candidate role names. Panda and UnoCSS both
 * consume the same flat semantic palette, so a single mapping table
 * feeds both serializers below. Each token tries its candidates in
 * order and takes the first role present in `state.roles`; a token is
 * omitted entirely when none of its candidates resolve, same defensive
 * fallback pattern as the site's `Tokens.ts` `ALIAS_SOURCE`.
 */
const TOKEN_SOURCE: Record<string, readonly string[]> = {
  'background': ['background'],
  'border':     ['border', 'divider', 'muted'],
  'error':      ['error'],
  'info':       ['info', 'brand'],
  'primary':    ['brand'],
  'secondary':  ['accent-alt', 'brand'],
  'success':    ['success', 'brand'],
  'surface':    ['surface', 'bg-soft', 'background'],
  'text':       ['text'],
  'textMuted':  ['text-subtle', 'muted', 'text'],
  'warning':    ['warning', 'brand']
};

/**
 * Resolves the shared `colors` map (token name → hex) from resolved
 * roles by walking `TOKEN_SOURCE` candidates in order.
 */
class TokenColors {
  static build(roles: Record<string, ColorRecordInterfaceType>): Record<string, string> {
    const colors: Record<string, string> = {};

    for (const [token, candidates] of Object.entries(TOKEN_SOURCE)) {
      for (const candidate of candidates) {
        const record = roles[candidate];
        if (record !== undefined) {
          colors[token] = record.hex;
          break;
        }
      }
    }

    return colors;
  }
}

/**
 * Serializes the shared colors map to a `panda.config.ts` module. Panda's
 * design-token convention wraps every leaf value as `{ value: hex }`,
 * nested under `theme.extend.tokens.colors`.
 */
class PandaConfigModule {
  static serialize(colors: Record<string, string>): string {
    const lines: string[] = [
      'export default defineConfig({',
      '  theme: {',
      '    extend: {',
      '      tokens: {',
      '        colors: {'
    ];
    for (const [key, hex] of Object.entries(colors)) {
      lines.push(`          '${key}': { value: '${hex}' },`);
    }
    lines.push(
      '        },',
      '      },',
      '    },',
      '  },',
      '});'
    );
    return lines.join('\n');
  }
}

/**
 * Serializes the shared colors map to a UnoCSS config module. UnoCSS
 * consumes flat hex values directly, nested under `theme.colors`.
 */
class UnoConfigModule {
  static serialize(colors: Record<string, string>): string {
    const lines: string[] = [
      'export default defineConfig({',
      '  theme: {',
      '    colors: {'
    ];
    for (const [key, hex] of Object.entries(colors)) {
      lines.push(`      '${key}': '${hex}',`);
    }
    lines.push(
      '    },',
      '  },',
      '});'
    );
    return lines.join('\n');
  }
}

/**
 * Emit a Panda CSS token config and a UnoCSS-compatible theme object
 * from the same resolved-role color map. Registered as the
 * `emit:pandaTheme` pipeline task.
 */
export class EmitPandaTheme implements TaskInterface {
  readonly 'name' = 'emit:pandaTheme';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Emit Panda CSS token config and a UnoCSS-compatible theme object from the same resolved-role color map',
    'name':        'emit:pandaTheme',
    'phase':       undefined,
    'reads':       ['roles'],
    'requires':    undefined,
    'writes':      ['outputs.panda:theme']
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const colors = TokenColors.build(state.roles);

    const pandaConfig = PandaConfigModule.serialize(colors);
    const unoConfig   = UnoConfigModule.serialize(colors);

    const output: PandaOutputInterfaceType = {
      'colors':      colors,
      'pandaConfig': pandaConfig,
      'unoConfig':   unoConfig
    };

    state.outputs['panda:theme'] = output;

    ctx.logger.debug(
      LogBody.create()
        .component('EmitPandaTheme')
        .operation('run')
        .status(LOG_STATUS.SUCCESS)
        .message('Emitted Panda/UnoCSS theme')
        .context({ 'tokens': Object.keys(colors).length })
        .build()
    );
  }
}
