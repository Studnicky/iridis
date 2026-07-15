import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import type {
  ColorRecordInterfaceType,
  PaletteStateInterface,
  PipelineContextInterface,
  RoleDefinitionInterfaceType,
  TaskInterface,
  TaskManifestInterfaceType
} from '../../types/index.ts';

import { clamp } from '../../math/Clamp.ts';
import { clamp01 } from '../../math/Clamp01.ts';
import { colorRecordFactory } from '../../math/ColorRecordFactory.ts';
import { RoleGeometry } from '../RoleGeometry.ts';

function deriveColor(
  source: ColorRecordInterfaceType,
  role: RoleDefinitionInterfaceType
): ColorRecordInterfaceType {
  const { c, h, l } = source.oklch;

  const targetL = role.lightnessRange !== undefined ? RoleGeometry.rangeCenter(role.lightnessRange) : l;
  const targetC = role.chromaRange    !== undefined ? RoleGeometry.rangeCenter(role.chromaRange)    : c;

  let targetH: number;
  if (role.hue !== undefined) {
    targetH = role.hueClamp !== undefined
      ? RoleGeometry.hueTowards(h, role.hue, role.hueClamp)
      : (((role.hue % 360) + 360) % 360);
  } else if (role.hueOffset !== undefined) {
    targetH = ((h + role.hueOffset) % 360 + 360) % 360;
  } else {
    targetH = h;
  }

  return colorRecordFactory.fromOklch(
    clamp01.apply(targetL),
    clamp.apply(0, 0.5, targetC),
    targetH,
    { 'alpha': source.alpha }
  );
}

/**
 * Pipeline task that fills in roles declared with `derivedFrom` from
 * the assigned source role's color, applying the role's own
 * lightness/chroma centers (and `hueOffset` if set) as the OKLCH
 * coordinates. Already-assigned derived roles are left alone; explicit
 * input wins over family derivation.
 *
 * Runs after `resolve:roles` so source roles exist; missing sources
 * are warned about and skipped rather than throwing, on the principle
 * that a partially-rendered palette is more useful than a hard failure.
 */
class ExpandFamily implements TaskInterface {
  readonly 'name' = 'expand:family';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Derives missing roles that have derivedFrom set. Applies OKLCH deltas from the source role (hueOffset/hue/hueClamp, optionally overridden per role via metadata[\'core:hueOffsetOverrides\']/[\'core:hueTargetOverrides\']). Never overwrites an already-assigned role.',
    'name':        'expand:family',
    'reads':       ['roles', 'input.roles', 'metadata'],
    'writes':      ['roles']
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    if (state.input.roles === undefined) {
      ctx.logger.debug(
        LogBody.create()
          .component('ExpandFamily')
          .operation('run')
          .status(LOG_STATUS.SKIPPED)
          .message('No role schema; skipping')
          .context({})
          .build()
      );
      return;
    }

    const hueOffsetOverrides = state.metadata['core:hueOffsetOverrides'] as Record<string, number> | undefined;
    const hueTargetOverrides = state.metadata['core:hueTargetOverrides'] as Record<string, { 'hue': number; 'hueClamp'?: number }> | undefined;

    for (const inputRole of state.input.roles.roles) {
      if (inputRole.derivedFrom === undefined || inputRole.derivedFrom === '') {
        continue;
      }

      const derivedFrom = inputRole.derivedFrom;
      const offsetOverride = hueOffsetOverrides?.[inputRole.name];
      const targetOverride = hueTargetOverrides?.[inputRole.name];
      const role = {
        ...inputRole,
        ...(offsetOverride === undefined ? {} : { 'hueOffset': offsetOverride }),
        ...(targetOverride === undefined ? {} : { 'hue': targetOverride.hue }),
        ...(targetOverride?.hueClamp === undefined ? {} : { 'hueClamp': targetOverride.hueClamp })
      };

      if (state.roles[role.name] !== undefined) {
        ctx.logger.debug(
          LogBody.create()
            .component('ExpandFamily')
            .operation('run')
            .status(LOG_STATUS.SKIPPED)
            .message('Role already assigned; skipping')
            .context({ 'role': role.name })
            .build()
        );
        continue;
      }

      const sourceColor = state.roles[derivedFrom];

      if (sourceColor === undefined) {
        ctx.logger.warn(
          LogBody.create()
            .component('ExpandFamily')
            .operation('run')
            .status(LOG_STATUS.INVALID)
            .message('Role derivedFrom source is not assigned')
            .context({
              'derivedFrom': derivedFrom,
              'role':        role.name
            })
            .build()
        );
        continue;
      }

      state.roles[role.name] = deriveColor(sourceColor, role);
      const existingDerived = state.metadata['core:rolesDerived'];
      const priorDerived: string[] = Array.isArray(existingDerived) ? (existingDerived as string[]) : [];
      state.metadata['core:rolesDerived'] = [...priorDerived, role.name];

      ctx.logger.debug(
        LogBody.create()
          .component('ExpandFamily')
          .operation('run')
          .status(LOG_STATUS.SUCCESS)
          .message('Derived role from source')
          .context({
            'derivedFrom': derivedFrom,
            'role':        role.name
          })
          .build()
      );
    }
  }
}

/** Singleton instance registered as the `expand:family` pipeline task. */
export const expandFamily = new ExpandFamily();
