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

    // Math primitives operate on ColorRecord; keep the records on the
    // role lookups so we don't reconvert at every invoke.
    const bgRec    = state.roles['background'];
    const mutedRec = state.roles['muted'];
    const fgRec    = state.roles['foreground'];
    if (!bgRec || !mutedRec || !fgRec) {
      throw new Error('ExpandTokens: requires roles background, muted, foreground');
    }

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
        const mixed = ctx.math.invoke<ColorRecordInterface>('mixHsl', mutedRec, fgRec, 0.4);
        const contrasted = ctx.math.invoke<ColorRecordInterface>('ensureContrast', mixed, bgRec, 3.5);
        baseTokens['operator'] = contrasted.hex;
        continue;
      }

      const sourceRec = state.roles[familyRole];
      if (!sourceRec) {
        ctx.logger.warn('ExpandTokens', 'run', `Source role '${familyRole}' not found for token type '${tokenType}'`);
        continue;
      }

      let color: ColorRecordInterface = sourceRec;

      if (params.hue) {
        color = ctx.math.invoke<ColorRecordInterface>('hueShift', color, params.hue);
      }
      if (params.sat) {
        if (params.sat > 0) {
          color = ctx.math.invoke<ColorRecordInterface>('saturate', color, params.sat);
        } else {
          color = ctx.math.invoke<ColorRecordInterface>('desaturate', color, -params.sat);
        }
      }
      if (params.light) {
        if (params.light > 0) {
          color = ctx.math.invoke<ColorRecordInterface>('lighten', color, params.light);
        } else {
          color = ctx.math.invoke<ColorRecordInterface>('darken', color, -params.light);
        }
      }

      // comment gets relaxed contrast (3.0), everything else 4.5
      const minContrast = tokenType === 'comment' ? 3.0 : 4.5;
      const contrasted = ctx.math.invoke<ColorRecordInterface>('ensureContrast', color, bgRec, minContrast);
      baseTokens[tokenType] = contrasted.hex;
    }

    meta['baseTokens'] = baseTokens;
    ctx.logger.debug('ExpandTokens', 'run', `Derived ${Object.keys(baseTokens).length} base token colours`);
  }
}

export const expandTokens = new ExpandTokens();
