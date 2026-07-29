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
  FramingSurface,
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
    'reads':       ['roles', 'runtime.framing', 'variants'],
    'requires':    undefined,
    'writes':      ['metadata.vscode:baseTokens']
  };

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {

    // `state.runtime.framing` selects state.roles or a state.variants
    // entry (see FramingSurface); every role lookup below reads from
    // that resolved surface, not state.roles directly, so base tokens
    // follow the requested framing end-to-end.
    const roles = FramingSurface.resolve(state);

    // Math primitives operate on ColorRecord; keep the records on the
    // role lookups so we don't reconvert at every invoke.
    const backgroundRecord = roles.background;
    const mutedRecord = roles.muted;
    const foregroundRecord = roles.foreground;
    if (backgroundRecord === undefined || mutedRecord === undefined || foregroundRecord === undefined) {
      const missingRoles = [
        backgroundRecord === undefined ? 'background' : undefined,
        mutedRecord === undefined      ? 'muted'      : undefined,
        foregroundRecord === undefined ? 'foreground' : undefined
      ].filter((role): role is string => { return role !== undefined; });
      throw ModuleError.create('ExpandTokens: requires roles background, muted, foreground', {
        'context':  { 'missingRoles': missingRoles, 'task': 'ExpandTokens' },
        'scenario': 'NOT_FOUND'
      });
    }

    const baseTokens: Record<string, ColorRecordInterfaceType> = {};

    const tokenTypeCount = VscodeTokenData.TOKEN_TYPES.length;
    for (let i = 0; i < tokenTypeCount; i++) {
      const tokenType = VscodeTokenData.TOKEN_TYPES[i];
      if (tokenType === undefined) {continue;}

      const familyRole = VscodeTokenData.TOKEN_FAMILY[tokenType];
      if (familyRole === undefined) {
        context.logger.warn(
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

      const parameters = VscodeTokenData.DERIVATION_PARAMS[tokenType] ?? {
        'hue': undefined,
        'light': undefined,
        'sat': undefined
      };

      // operator is special: mix muted + foreground
      if (tokenType === 'operator') {
        const mixed = mixHsl.apply(mutedRecord, foregroundRecord, 0.4);
        const contrasted = ensureContrast.apply(mixed, backgroundRecord, 3.5);
        baseTokens.operator = contrasted;
        continue;
      }

      const familyRec = roles[familyRole];
      if (familyRec === undefined) {
        context.logger.warn(
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

      if (parameters.hue !== undefined && parameters.hue !== 0) {
        color = hueShift.apply(color, parameters.hue);
      }
      if (parameters.sat !== undefined && parameters.sat !== 0) {
        // DERIVATION_PARAMS.sat is a percentage point (e.g. -5 = 5%); the
        // saturate/desaturate primitives take a raw 0-0.5 chroma delta.
        const chromaDelta = Math.abs(parameters.sat) / 100;
        if (parameters.sat > 0) {
          color = saturate.apply(color, chromaDelta);
        } else {
          color = desaturate.apply(color, chromaDelta);
        }
      }
      if (parameters.light !== undefined && parameters.light !== 0) {
        // DERIVATION_PARAMS.light is a percentage point; lighten/darken
        // take a raw 0-1 OKLCH lightness delta.
        const lightnessDelta = Math.abs(parameters.light) / 100;
        if (parameters.light > 0) {
          color = lighten.apply(color, lightnessDelta);
        } else {
          color = darken.apply(color, lightnessDelta);
        }
      }

      // comment gets relaxed contrast (3.0), everything else 4.5
      const minimumContrast = tokenType === 'comment' ? 3.0 : 4.5;
      const contrasted = ensureContrast.apply(color, backgroundRecord, minimumContrast);
      baseTokens[tokenType] = contrasted;
    }

    state.metadata['vscode:baseTokens'] = baseTokens;
    context.logger.debug(
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
