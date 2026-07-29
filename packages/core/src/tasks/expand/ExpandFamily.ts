import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import type {
  ColorHintsInterfaceType,
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

// json-schema-uninexpressible: composes RoleDefinitionInterfaceType, itself widened from a
// JSON Schema entity via the codebase's hidden-class convention (T | undefined on optional
// keys) — re-deriving that shape from a nested Schema loses the widening and breaks
// exactOptionalPropertyTypes assignability against RoleDefinitionInterfaceType call sites.
/** A derived role whose source has not resolved yet, queued for a later pass by `expand:family`. */
type PendingDerivedRoleType = {
  'derivedFrom': string;
  'inputRole':   RoleDefinitionInterfaceType;
};

class RoleDerivation {
  static deriveColor(
    source: ColorRecordInterfaceType,
    role: RoleDefinitionInterfaceType
  ): ColorRecordInterfaceType {
    const { c, h, l } = source.oklch;

    const targetL = role.lightnessRange !== undefined ? RoleGeometry.rangeCenter(role.lightnessRange) : l;
    const targetC = role.chromaRange    !== undefined ? RoleGeometry.rangeCenter(role.chromaRange)    : c;

    let targetH: number;
    if (role.hue !== undefined) {
      targetH = RoleGeometry.hueTowards(h, role.hue, role.hueClamp ?? RoleGeometry.DEFAULT_HUE_CLAMP);
    } else if (role.hueOffset !== undefined) {
      targetH = ((h + role.hueOffset) % 360 + 360) % 360;
    } else {
      targetH = h;
    }

    const hints: ColorHintsInterfaceType | undefined = role.intent === undefined
      ? undefined
      : { 'intent': role.intent, 'role': undefined, 'weight': undefined };

    return colorRecordFactory.fromOklch(
      clamp01.apply(targetL),
      clamp.apply(0, 0.5, targetC),
      targetH,
      { 'alpha': source.alpha, 'hints': hints }
    );
  }
}

/**
 * Pipeline task that fills in roles declared with `derivedFrom` from
 * the assigned source role's color, applying the role's own
 * lightness/chroma centers (and `hueOffset` if set) as the OKLCH
 * coordinates. Already-assigned derived roles are left alone; explicit
 * input wins over family derivation.
 *
 * Resolves to a fixed point: a derived role whose source is itself a
 * derived role appearing later in `roles` is retried on subsequent
 * passes, so derivation order in the schema never produces a hole.
 * Iteration stops once a pass makes no progress; anything still
 * unresolved at that point (missing source, or a `derivedFrom` cycle)
 * is warned about and left unassigned rather than looping forever, on
 * the principle that a partially-rendered palette is more useful than
 * a hard failure.
 *
 * Runs after `resolve:roles` so non-derived source roles exist.
 */
class ExpandFamily implements TaskInterface {
  readonly 'name' = 'expand:family';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Derives missing roles that have derivedFrom set. Applies OKLCH deltas from the source role (hueOffset/hue/hueClamp, optionally overridden per role via metadata[\'core:hueOffsetOverrides\']/[\'core:hueTargetOverrides\']). Never overwrites an already-assigned role.',
    'name':        'expand:family',
    'phase':       undefined,
    'reads':       ['roles', 'input.roles', 'metadata'],
    'requires':    undefined,
    'writes':      ['roles']
  };

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    if (state.input.roles === undefined) {
      context.logger.debug(
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
    const hueTargetOverrides = state.metadata['core:hueTargetOverrides'] as Record<string, { 'hue': number; 'hueClamp': number | undefined }> | undefined;

    let pending: PendingDerivedRoleType[] = [];
    for (const inputRole of state.input.roles.roles) {
      if (inputRole.derivedFrom === undefined || inputRole.derivedFrom === '') {
        continue;
      }
      if (state.roles[inputRole.name] !== undefined) {
        context.logger.debug(
          LogBody.create()
            .component('ExpandFamily')
            .operation('run')
            .status(LOG_STATUS.SKIPPED)
            .message('Role already assigned; skipping')
            .context({ 'role': inputRole.name })
            .build()
        );
        continue;
      }
      pending.push({ 'derivedFrom': inputRole.derivedFrom, 'inputRole': inputRole });
    }

    // Fixed-point resolution: a derived role whose source is itself a
    // derived role appearing later in `roles` is unresolvable on its first
    // pass and stays queued; each further pass retries whatever is left.
    // The loop terminates once a full pass derives nothing new — this is
    // the cycle guard, so a genuine derivedFrom cycle can never spin forever.
    // Each pass rebuilds the pending list from scratch (rather than
    // splicing mid-loop, which is O(n^2) over repeated passes).
    let progressed = true;
    while (progressed && pending.length > 0) {
      progressed = false;
      const stillPending: PendingDerivedRoleType[] = [];

      for (const { derivedFrom, inputRole } of pending) {
        const sourceColor = state.roles[derivedFrom];
        if (sourceColor === undefined) {
          stillPending.push({ 'derivedFrom': derivedFrom, 'inputRole': inputRole });
          continue;
        }

        const offsetOverride = hueOffsetOverrides?.[inputRole.name];
        const targetOverride = hueTargetOverrides?.[inputRole.name];
        const role = {
          ...inputRole,
          'hue':       targetOverride?.hue ?? inputRole.hue,
          'hueClamp':  targetOverride?.hueClamp ?? inputRole.hueClamp,
          'hueOffset': offsetOverride ?? inputRole.hueOffset
        };

        state.roles[role.name] = RoleDerivation.deriveColor(sourceColor, role);
        const existingDerived = state.metadata['core:rolesDerived'];
        const priorDerived: string[] = Array.isArray(existingDerived) ? (existingDerived as string[]) : [];
        state.metadata['core:rolesDerived'] = [...priorDerived, role.name];

        context.logger.debug(
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

        progressed = true;
      }

      pending = stillPending;
    }

    // Whatever remains after the fixed point has an unassigned source —
    // either it was never in the schema, or it sits in a derivedFrom cycle.
    for (const { derivedFrom, inputRole } of pending) {
      context.logger.warn(
        LogBody.create()
          .component('ExpandFamily')
          .operation('run')
          .status(LOG_STATUS.INVALID)
          .message('Role derivedFrom source is not assigned')
          .context({
            'derivedFrom': derivedFrom,
            'role':        inputRole.name
          })
          .build()
      );
    }
  }
}

/** Singleton instance registered as the `expand:family` pipeline task. */
export const expandFamily = new ExpandFamily();
