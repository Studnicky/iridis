import type {
  ColorRecordInterfaceType,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterfaceType
} from '@studnicky/iridis';

import { ModuleError } from '@studnicky/errors';
import {
  darken,
  desaturate,
  ensureContrast,
  hueShift,
  lighten,
  mixHsl,
  saturate
} from '@studnicky/iridis';
import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import { VscodeTokenData } from '../data/VscodeTokenData.ts';

class ExpandTokens implements TaskInterface {
  readonly 'name' = 'vscode:expandTokens';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Derives 23 VS Code base token colours from the 16 palette roles using DERIVATION_PARAMS.',
    'name':        'vscode:expandTokens',
    'phase':       undefined,
    'reads':       ['roles'],
    'requires':    undefined,
    'writes':      ['metadata.vscode:baseTokens']
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {

    // Math primitives operate on ColorRecord; keep the records on the
    // role lookups so we don't reconvert at every invoke.
    const bgRec    = state.roles.background;
    const mutedRec = state.roles.muted;
    const fgRec    = state.roles.foreground;
    if (bgRec === undefined || mutedRec === undefined || fgRec === undefined) {
      const missingRoles = [
        bgRec === undefined    ? 'background' : undefined,
        mutedRec === undefined ? 'muted'      : undefined,
        fgRec === undefined    ? 'foreground' : undefined
      ].filter((r): r is string => { return r !== undefined; });
      throw ModuleError.create('ExpandTokens: requires roles background, muted, foreground', {
        'context':  { 'missingRoles': missingRoles, 'task': 'ExpandTokens' },
        'scenario': 'NOT_FOUND'
      });
    }

    const baseTokens: Record<string, ColorRecordInterfaceType> = {};

    const len = VscodeTokenData.TOKEN_TYPES.length;
    for (let i = 0; i < len; i++) {
      const tokenType = VscodeTokenData.TOKEN_TYPES[i];
      if (tokenType === undefined) {continue;}

      const familyRole = VscodeTokenData.TOKEN_FAMILY[tokenType];
      if (familyRole === undefined) {
        ctx.logger.warn(
          LogBody.create()
            .component('ExpandTokens')
            .operation('run')
            .status(LOG_STATUS.NOT_FOUND)
            .message('No family role for token type')
            .context({ 'tokenType': tokenType })
            .build()
        );
        continue;
      }

      const params = VscodeTokenData.DERIVATION_PARAMS[tokenType] ?? {
        'hue': undefined,
        'light': undefined,
        'sat': undefined
      };

      // operator is special: mix muted + foreground
      if (tokenType === 'operator') {
        const mixed = mixHsl.apply(mutedRec, fgRec, 0.4);
        const contrasted = ensureContrast.apply(mixed, bgRec, 3.5);
        baseTokens.operator = contrasted;
        continue;
      }

      const familyRec = state.roles[familyRole];
      if (familyRec === undefined) {
        ctx.logger.warn(
          LogBody.create()
            .component('ExpandTokens')
            .operation('run')
            .status(LOG_STATUS.NOT_FOUND)
            .message('No role record for family')
            .context({ 'familyRole': familyRole, 'tokenType': tokenType })
            .build()
        );
        continue;
      }
      let color: ColorRecordInterfaceType = familyRec;

      if (params.hue !== undefined && params.hue !== 0) {
        color = hueShift.apply(color, params.hue);
      }
      if (params.sat !== undefined && params.sat !== 0) {
        // DERIVATION_PARAMS.sat is a percentage point (e.g. -5 = 5%); the
        // saturate/desaturate primitives take a raw 0-0.5 chroma delta.
        const deltaC = Math.abs(params.sat) / 100;
        if (params.sat > 0) {
          color = saturate.apply(color, deltaC);
        } else {
          color = desaturate.apply(color, deltaC);
        }
      }
      if (params.light !== undefined && params.light !== 0) {
        // DERIVATION_PARAMS.light is a percentage point; lighten/darken
        // take a raw 0-1 OKLCH lightness delta.
        const deltaL = Math.abs(params.light) / 100;
        if (params.light > 0) {
          color = lighten.apply(color, deltaL);
        } else {
          color = darken.apply(color, deltaL);
        }
      }

      // comment gets relaxed contrast (3.0), everything else 4.5
      const minContrast = tokenType === 'comment' ? 3.0 : 4.5;
      const contrasted = ensureContrast.apply(color, bgRec, minContrast);
      baseTokens[tokenType] = contrasted;
    }

    state.metadata['vscode:baseTokens'] = baseTokens;
    ctx.logger.debug(
      LogBody.create()
        .component('ExpandTokens')
        .operation('run')
        .status(LOG_STATUS.SUCCESS)
        .message('Derived base token colours')
        .context({ 'count': Object.keys(baseTokens).length })
        .build()
    );
  }
}

export const expandTokens = new ExpandTokens();
