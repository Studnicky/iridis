import type {
  ColorRecordInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '@studnicky/iridis';
import { DERIVATION_PARAMS, TOKEN_FAMILY, TOKEN_TYPES } from '../data/derivationParams.ts';

/** State shape written by this task. */
interface VscodeMetaInterface {
  'baseTokens': Record<string, string>;
}

function getVscodeMeta(state: PaletteStateInterface): VscodeMetaInterface {
  const existing = state.metadata['vscode'];
  if (existing !== null && typeof existing === 'object' && 'baseTokens' in existing) {
    return existing as VscodeMetaInterface;
  }
  const meta: VscodeMetaInterface = { 'baseTokens': {} };
  state.metadata['vscode'] = meta;
  return meta;
}

function recordHex(record: ColorRecordInterface): string {
  return record.hex;
}

function roleHex(state: PaletteStateInterface, role: string): string {
  const record = state.roles[role];
  if (!record) {
    throw new Error(`ExpandTokens: role '${role}' not found in state.roles`);
  }
  return recordHex(record);
}

export class ExpandTokens implements TaskInterface {
  readonly 'name' = 'vscode:expandTokens';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'vscode:expandTokens',
    'reads':       ['roles'],
    'writes':      ['metadata.vscode.baseTokens'],
    'description': 'Derives 23 VS Code base token colours from the 16 palette roles using DERIVATION_PARAMS.',
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const meta = getVscodeMeta(state);
    const bg = roleHex(state, 'background');

    // operator = mix(muted, foreground, 0.4) then ensureContrast 3.5
    const mutedHex = roleHex(state, 'muted');
    const fgHex = roleHex(state, 'foreground');

    const baseTokens: Record<string, string> = {};

    const len = TOKEN_TYPES.length;
    for (let i = 0; i < len; i++) {
      const tokenType = TOKEN_TYPES[i];
      if (!tokenType) continue;

      const familyRole = TOKEN_FAMILY[tokenType];
      if (!familyRole) {
        ctx.logger.warn('ExpandTokens', 'run', `No family role for token type '${tokenType}'`);
        continue;
      }

      const params = DERIVATION_PARAMS[tokenType] ?? {};

      // operator is special: mix muted + foreground
      if (tokenType === 'operator') {
        const mixed = ctx.math.invoke<string>('mixHsl', mutedHex, fgHex, 0.4);
        const contrasted = ctx.math.invoke<string>('ensureContrast', mixed, bg, 3.5);
        baseTokens['operator'] = contrasted;
        continue;
      }

      let color = roleHex(state, familyRole);

      if (params.hue) {
        color = ctx.math.invoke<string>('hueShift', color, params.hue);
      }
      if (params.sat) {
        if (params.sat > 0) {
          color = ctx.math.invoke<string>('saturate', color, params.sat);
        } else {
          color = ctx.math.invoke<string>('desaturate', color, -params.sat);
        }
      }
      if (params.light) {
        if (params.light > 0) {
          color = ctx.math.invoke<string>('lighten', color, params.light);
        } else {
          color = ctx.math.invoke<string>('darken', color, -params.light);
        }
      }

      // comment gets relaxed contrast (3.0), everything else 4.5
      const minContrast = tokenType === 'comment' ? 3.0 : 4.5;
      const contrasted = ctx.math.invoke<string>('ensureContrast', color, bg, minContrast);
      baseTokens[tokenType] = contrasted;
    }

    meta['baseTokens'] = baseTokens;
    ctx.logger.debug('ExpandTokens', 'run', `Derived ${Object.keys(baseTokens).length} base token colours`);
  }
}

export const expandTokens = new ExpandTokens();
