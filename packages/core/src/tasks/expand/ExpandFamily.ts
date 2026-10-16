import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import type {
  ColorHintsInterfaceType,
  ColorRecordInterfaceType,
  PaletteStateInterface,
  PipelineContextInterface,
  RoleDefinitionInterfaceType,
  RoleProvenanceInterfaceType,
  TaskInterface,
  TaskManifestInterfaceType
} from '../../types/index.ts';

import { clamp } from '../../math/Clamp.ts';
import { clamp01 } from '../../math/Clamp01.ts';
import { colorRecordFactory } from '../../math/ColorRecordFactory.ts';
import { EngineMetadata } from '../../types/metadata.ts';
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
  ): {
    readonly 'adjustments': RoleProvenanceInterfaceType['adjustments'];
    readonly 'color': ColorRecordInterfaceType;
  } {
    const { c, h, l } = source.oklch;
    const derivesFromSource = role.lightnessOffset !== undefined || role.chromaScale !== undefined;
    const sourceL = l + (role.lightnessOffset ?? 0);
    const sourceC = c * (role.chromaScale ?? 1);
    let targetL = l;
    let targetC = c;

    if (derivesFromSource) {
      targetL = sourceL;
      targetC = sourceC;
      if (role.lightnessRange !== undefined) {
        targetL = clamp.apply(role.lightnessRange[0], role.lightnessRange[1], sourceL);
      }
      if (role.chromaRange !== undefined) {
        targetC = clamp.apply(role.chromaRange[0], role.chromaRange[1], sourceC);
      }
    } else {
      if (role.lightnessRange !== undefined) {
        targetL = RoleGeometry.rangeCenter(role.lightnessRange);
      }
      if (role.chromaRange !== undefined) {
        targetC = RoleGeometry.rangeCenter(role.chromaRange);
      }
    }

    let targetH = h;
    if (role.hue !== undefined) {
      targetH = RoleGeometry.hueTowards(h, role.hue, role.hueClamp ?? RoleGeometry.DEFAULT_HUE_CLAMP);
    } else if (role.hueOffset !== undefined) {
      targetH = ((h + role.hueOffset) % 360 + 360) % 360;
    }

    const hints: ColorHintsInterfaceType | undefined = role.intent === undefined
      ? undefined
      : { 'intent': role.intent, 'role': undefined, 'weight': undefined };
    const options = { 'alpha': source.alpha, 'hints': hints };
    const adjustments: RoleProvenanceInterfaceType['adjustments'] = [];
    let color = source;
    const ranged = colorRecordFactory.fromOklch(
      clamp01.apply(targetL),
      clamp.apply(0, 0.5, targetC),
      h,
      options
    );

    if (ranged.hex !== color.hex) {
      adjustments.push({ 'afterHex': ranged.hex, 'beforeHex': color.hex, 'operation': 'role-range' });
      color = ranged;
    }

    const hued = colorRecordFactory.fromOklch(
      clamp01.apply(targetL),
      clamp.apply(0, 0.5, targetC),
      targetH,
      options
    );

    if (hued.hex !== color.hex) {
      adjustments.push({ 'afterHex': hued.hex, 'beforeHex': color.hex, 'operation': 'hue-target' });
    }

    return { 'adjustments': adjustments, 'color': hued };
  }
}

/**
 * Pipeline task that fills in roles declared with `derivedFrom` from
 * the assigned source role's color, applying the role's own
 * lightness/chroma centers, or source-relative derivation controls when set,
 * plus `hueOffset` as the OKLCH
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
    'writes':      ['roles', 'metadata']
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

    const hueOffsetOverrides = EngineMetadata.get(state.metadata, 'core:hueOffsetOverrides');
    const hueTargetOverrides = EngineMetadata.get(state.metadata, 'core:hueTargetOverrides');
    const roleProvenance = EngineMetadata.get(state.metadata, 'core:roleProvenance') ?? {};

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

        const derivation = RoleDerivation.deriveColor(sourceColor, role);
        state.roles[role.name] = derivation.color;
        roleProvenance[role.name] = { 'adjustments': derivation.adjustments, 'origin': 'derived' };
        state.metadata['core:roleProvenance'] = roleProvenance;

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
