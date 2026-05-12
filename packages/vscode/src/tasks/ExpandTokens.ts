import type {
  ColorRecordInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '@studnicky/iridis';
import {
  colorRecordFactory,
  darken,
  desaturate,
  ensureContrast,
  hueShift,
  lighten,
  mixHsl,
  saturate,
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
    const bg = roleHex(state, 'background');
    const bgRecord = colorRecordFactory.fromHex(bg);

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
        const mixed = mixHsl.apply(
          colorRecordFactory.fromHex(mutedHex),
          colorRecordFactory.fromHex(fgHex),
          0.4,
        );
        const contrasted = ensureContrast.apply(mixed, bgRecord, 3.5);
        baseTokens['operator'] = contrasted.hex;
        continue;
      }

      let color = colorRecordFactory.fromHex(roleHex(state, familyRole));

      if (params.hue) {
        color = hueShift.apply(color, params.hue);
      }
      if (params.sat) {
        if (params.sat > 0) {
          color = saturate.apply(color, params.sat);
        } else {
          color = desaturate.apply(color, -params.sat);
        }
      }
      if (params.light) {
        if (params.light > 0) {
          color = lighten.apply(color, params.light);
        } else {
          color = darken.apply(color, -params.light);
        }
      }

      // comment gets relaxed contrast (3.0), everything else 4.5
      const minContrast = tokenType === 'comment' ? 3.0 : 4.5;
      const contrasted = ensureContrast.apply(color, bgRecord, minContrast);
      baseTokens[tokenType] = contrasted.hex;
    }

    meta['baseTokens'] = baseTokens;
    ctx.logger.debug('ExpandTokens', 'run', `Derived ${Object.keys(baseTokens).length} base token colours`);
  }
}

export const expandTokens = new ExpandTokens();
