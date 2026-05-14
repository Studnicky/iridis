import type {
  ColorRecordInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '@studnicky/iridis';
import {
  darken,
  desaturate,
  ensureContrast,
  getOrCreateMetadata,
  hueShift,
  lighten,
  mixHsl,
  saturate,
} from '@studnicky/iridis';
import { DERIVATION_PARAMS, TOKEN_FAMILY, TOKEN_TYPES } from '../data/derivationParams.ts';

export class ExpandTokens implements TaskInterface {
  readonly 'name' = 'vscode:expandTokens';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'vscode:expandTokens',
    'reads':       ['roles'],
    'writes':      ['metadata.vscode.baseTokens'],
    'description': 'Derives 23 VS Code base token colours from the 16 palette roles using DERIVATION_PARAMS.',
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const meta = getOrCreateMetadata(state, 'vscode');

    // Math primitives operate on ColorRecord; keep the records on the
    // role lookups so we don't reconvert at every invoke.
    const bgRec    = state.roles['background'];
    const mutedRec = state.roles['muted'];
    const fgRec    = state.roles['foreground'];
    if (!bgRec || !mutedRec || !fgRec) {
      throw new Error('ExpandTokens: requires roles background, muted, foreground');
    }

    const baseTokens: Record<string, ColorRecordInterface> = {};

    const len = TOKEN_TYPES.length;
    for (let i = 0; i < len; i++) {
      const tokenType = TOKEN_TYPES[i];
      if (!tokenType) continue;

      const familyRole = TOKEN_FAMILY[tokenType];
      if (!familyRole) {
        ctx.logger.warn('ExpandTokens', 'run', 'No family role for token type', { 'tokenType': tokenType });
        continue;
      }

      const params = DERIVATION_PARAMS[tokenType] ?? {};

      // operator is special: mix muted + foreground
      if (tokenType === 'operator') {
        const mixed = mixHsl.apply(mutedRec, fgRec, 0.4);
        const contrasted = ensureContrast.apply(mixed, bgRec, 3.5);
        baseTokens['operator'] = contrasted;
        continue;
      }

      const familyRec = state.roles[familyRole];
      if (!familyRec) {
        ctx.logger.warn('ExpandTokens', 'run', 'No role record for family', {
          'familyRole': familyRole,
          'tokenType':  tokenType,
        });
        continue;
      }
      let color: ColorRecordInterface = familyRec;

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
      const contrasted = ensureContrast.apply(color, bgRec, minContrast);
      baseTokens[tokenType] = contrasted;
    }

    meta['baseTokens'] = baseTokens;
    ctx.logger.debug('ExpandTokens', 'run', 'Derived base token colours', {
      'count': Object.keys(baseTokens).length,
    });
  }
}

export const expandTokens = new ExpandTokens();
