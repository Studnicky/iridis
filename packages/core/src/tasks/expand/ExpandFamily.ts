import { LOG_STATUS, LogBody } from '@studnicky/logger/node';

import type { ColorHintsInterfaceTypeEntity } from '../../entities/ColorHintsInterfaceTypeEntity.ts';
import type { ColorRecordInterfaceTypeEntity } from '../../entities/ColorRecordInterfaceTypeEntity.ts';
import type { PaletteStateInterface } from '../../interfaces/PaletteStateInterface.ts';
import type { PipelineContextInterface } from '../../interfaces/PipelineContextInterface.ts';
import type { TaskInterface } from '../../interfaces/TaskInterface.ts';

import { RoleDefinitionInterfaceTypeEntity } from '../../entities/RoleDefinitionInterfaceTypeEntity.ts';
import { RoleProvenanceInterfaceTypeEntity } from '../../entities/RoleProvenanceInterfaceTypeEntity.ts';
import { TaskManifestInterfaceTypeEntity } from '../../entities/TaskManifestInterfaceTypeEntity.ts';
import { PaletteRoleState } from '../../interfaces/PaletteStateInterface.ts';
import { clamp } from '../../math/Clamp.ts';
import { clamp01 } from '../../math/Clamp01.ts';
import { colorRecordFactory } from '../../math/ColorRecordFactory.ts';
import { Metadata } from '../../types/metadata.ts';
import { RoleGeometry } from '../RoleGeometry.ts';

/** A derived role whose source has not resolved yet, queued for a later pass by `expand:family`. */
class PendingDerivedRole {
  readonly 'derivedFrom': string;
  readonly 'inputRole': RoleDefinitionInterfaceTypeEntity.Type;

  constructor(derivedFrom: string, inputRole: RoleDefinitionInterfaceTypeEntity.Type) {
    this.derivedFrom = derivedFrom;
    this.inputRole = inputRole;
  }
}

class RoleDerivation {
  static deriveColor(
    source: ColorRecordInterfaceTypeEntity.Type,
    role: RoleDefinitionInterfaceTypeEntity.Type
  ): {
    readonly 'adjustments': RoleProvenanceInterfaceTypeEntity.Type['adjustments'];
    readonly 'color': ColorRecordInterfaceTypeEntity.Type;
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

    const hints: ColorHintsInterfaceTypeEntity.Type | undefined = role.intent === undefined
      ? undefined
      : { 'intent': role.intent };
    const options = { 'alpha': source.alpha, 'hints': hints };
    const adjustments: RoleProvenanceInterfaceTypeEntity.Type['adjustments'] = [];
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

  readonly 'manifest': TaskManifestInterfaceTypeEntity.Type = TaskManifestInterfaceTypeEntity.create({
    'description': 'Derives missing roles that have derivedFrom set. Applies OKLCH deltas from the source role (hueOffset/hue/hueClamp, optionally overridden per role via metadata[\'core:hueOffsetOverrides\']/[\'core:hueTargetOverrides\']). Never overwrites an already-assigned role.',
    'name':        'expand:family',
    'reads':       ['roles', 'input.roles', 'metadata'],
    'writes':      ['roles', 'metadata']
  });

  private static collectPending(
    state: PaletteStateInterface,
    context: PipelineContextInterface,
    roles: PaletteRoleState
  ): PendingDerivedRole[] {
    const roleDefinitions = state.input.roles?.roles;
    if (roleDefinitions === undefined) {
      return [];
    }

    const pending: PendingDerivedRole[] = [];
    for (let roleIndex = 0; roleIndex < roleDefinitions.length; roleIndex += 1) {
      const inputRole = roleDefinitions.at(roleIndex);
      const derivedFrom = inputRole?.derivedFrom;
      if (inputRole === undefined || derivedFrom === undefined || derivedFrom === '') {
        continue;
      }
      if (roles.has(inputRole.name)) {
        context.logger.debug(
          LogBody.create({
            'component': 'ExpandFamily',
            'context': { 'role': inputRole.name },
            'message': 'Role already assigned; skipping',
            'operation': 'run',
            'status': LOG_STATUS.SKIPPED
          })
        );
        continue;
      }
      pending.push(new PendingDerivedRole(derivedFrom, RoleDefinitionInterfaceTypeEntity.intake(inputRole)));
    }
    return pending;
  }

  private static derivePendingRole(
    state: PaletteStateInterface,
    context: PipelineContextInterface,
    roles: PaletteRoleState,
    pendingRole: PendingDerivedRole,
    hueOffsetOverrides: ReturnType<typeof Metadata.hueOffsetOverrides>,
    hueTargetOverrides: ReturnType<typeof Metadata.hueTargetOverrides>,
    roleProvenance: ReturnType<typeof Metadata.roleProvenance>
  ): boolean {
    const { derivedFrom, inputRole } = pendingRole;
    const sourceColor = roles.get(derivedFrom);
    if (sourceColor === undefined) {
      return false;
    }

    const offsetOverride = hueOffsetOverrides?.[inputRole.name];
    const targetOverride = hueTargetOverrides?.[inputRole.name];
    const hue = targetOverride?.hue ?? inputRole.hue;
    const hueClamp = targetOverride?.hueClamp ?? inputRole.hueClamp;
    const hueOffset = offsetOverride ?? inputRole.hueOffset;
    const role = RoleDefinitionInterfaceTypeEntity.intake({
      'name': inputRole.name,
      ...(inputRole.chromaRange === undefined ? {} : { 'chromaRange': inputRole.chromaRange }),
      ...(inputRole.chromaScale === undefined ? {} : { 'chromaScale': inputRole.chromaScale }),
      ...(inputRole.derivedFrom === undefined ? {} : { 'derivedFrom': inputRole.derivedFrom }),
      ...(inputRole.description === undefined ? {} : { 'description': inputRole.description }),
      ...(hue === undefined ? {} : { 'hue': hue }),
      ...(hueClamp === undefined ? {} : { 'hueClamp': hueClamp }),
      ...(hueOffset === undefined ? {} : { 'hueOffset': hueOffset }),
      ...(inputRole.intent === undefined ? {} : { 'intent': inputRole.intent }),
      ...(inputRole.lightnessOffset === undefined ? {} : { 'lightnessOffset': inputRole.lightnessOffset }),
      ...(inputRole.lightnessRange === undefined ? {} : { 'lightnessRange': inputRole.lightnessRange }),
      ...(inputRole.required === undefined ? {} : { 'required': inputRole.required })
    });
    const derivation = RoleDerivation.deriveColor(sourceColor, role);
    roles.set(role.name, derivation.color);
    roleProvenance.set(role.name, RoleProvenanceInterfaceTypeEntity.create({ 'adjustments': derivation.adjustments, 'origin': 'derived' }));
    context.logger.debug(
      LogBody.create({
        'component': 'ExpandFamily',
        'context': { 'derivedFrom': derivedFrom, 'role': role.name },
        'message': 'Derived role from source',
        'operation': 'run',
        'status': LOG_STATUS.SUCCESS
      })
    );
    return true;
  }

  private static resolvePending(
    state: PaletteStateInterface,
    context: PipelineContextInterface,
    roles: PaletteRoleState,
    initialPending: PendingDerivedRole[],
    hueOffsetOverrides: ReturnType<typeof Metadata.hueOffsetOverrides>,
    hueTargetOverrides: ReturnType<typeof Metadata.hueTargetOverrides>,
    roleProvenance: ReturnType<typeof Metadata.roleProvenance>
  ): PendingDerivedRole[] {
    let pending = initialPending;
    let progressed = true;
    while (progressed && pending.length > 0) {
      progressed = false;
      const stillPending: PendingDerivedRole[] = [];
      for (let pendingIndex = 0; pendingIndex < pending.length; pendingIndex += 1) {
        const pendingRole = pending.at(pendingIndex);
        if (pendingRole === undefined) {
          continue;
        }
        const derived = ExpandFamily.derivePendingRole(
          state,
          context,
          roles,
          pendingRole,
          hueOffsetOverrides,
          hueTargetOverrides,
          roleProvenance
        );
        if (derived) {
          progressed = true;
        } else {
          stillPending.push(pendingRole);
        }
      }
      pending = stillPending;
    }
    return pending;
  }

  private static warnUnresolved(context: PipelineContextInterface, pending: readonly PendingDerivedRole[]): void {
    for (let pendingIndex = 0; pendingIndex < pending.length; pendingIndex += 1) {
      const pendingRole = pending.at(pendingIndex);
      if (pendingRole === undefined) {
        continue;
      }
      context.logger.warn(
        LogBody.create({
          'component': 'ExpandFamily',
          'context': { 'derivedFrom': pendingRole.derivedFrom, 'role': pendingRole.inputRole.name },
          'message': 'Role derivedFrom source is not assigned',
          'operation': 'run',
          'status': LOG_STATUS.INVALID
        })
      );
    }
  }

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    if (state.input.roles === undefined) {
      context.logger.debug(
        LogBody.create({
          'component': 'ExpandFamily',
          'context': {},
          'message': 'No role schema; skipping',
          'operation': 'run',
          'status': LOG_STATUS.SKIPPED
        })
      );
      return;
    }

    const hueOffsetOverrides = Metadata.hueOffsetOverrides(state.metadata);
    const hueTargetOverrides = Metadata.hueTargetOverrides(state.metadata);
    const roleProvenance = Metadata.roleProvenance(state.metadata);
    const roles = PaletteRoleState.admit(state.roles);
    const pending = ExpandFamily.resolvePending(
      state,
      context,
      roles,
      ExpandFamily.collectPending(state, context, roles),
      hueOffsetOverrides,
      hueTargetOverrides,
      roleProvenance
    );
    roles.commit();
    Metadata.writeRoleProvenance(state.metadata, roleProvenance);
    ExpandFamily.warnUnresolved(context, pending);
  }
}

/** Singleton instance registered as the `expand:family` pipeline task. */
export const expandFamily = new ExpandFamily();
