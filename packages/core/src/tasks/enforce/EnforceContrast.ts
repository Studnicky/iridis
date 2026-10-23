import { LOG_STATUS, LogBody } from '@studnicky/logger/node';

import type { ColorRecordEntity } from '../../entities/ColorRecordEntity.ts';
import type { PipelineContextInterface } from '../../interfaces/PipelineContextInterface.ts';
import type { TaskInterface } from '../../interfaces/TaskInterface.ts';

import { ContrastAlgorithmTypeEntity } from '../../entities/ContrastAlgorithmTypeEntity.ts';
import { ContrastPairEntity } from '../../entities/ContrastPairEntity.ts';
import { ContrastReportEntity } from '../../entities/ContrastReportEntity.ts';
import { ContrastReportEntryEntity } from '../../entities/ContrastReportEntryEntity.ts';
import { PendingContrastEntryEntity } from '../../entities/PendingContrastEntryEntity.ts';
import { RoleProvenanceEntity } from '../../entities/RoleProvenanceEntity.ts';
import { TaskManifestEntity } from '../../entities/TaskManifestEntity.ts';
import {
  PaletteRoleState,
  type PaletteStateInterface
} from '../../interfaces/PaletteStateInterface.ts';
import { contrastApca } from '../../math/ContrastApca.ts';
import { contrastWcag21 } from '../../math/ContrastWcag21.ts';
import { ensureContrast } from '../../math/EnsureContrast.ts';
import { Metadata } from '../../types/metadata.ts';
import { ContrastPolicy } from './ContrastPolicy.ts';

class ContrastMeasurement {
  static measure(
    algorithm: ContrastAlgorithmTypeEntity.Type,
    foreground: ColorRecordEntity.Type,
    background: ColorRecordEntity.Type
  ): number {
    if (algorithm === 'apca') {
      const result = Math.abs(contrastApca.apply(foreground, background));
      return result;
    }
    const result = contrastWcag21.apply(foreground, background);
    return result;
  }

  static sameRecord(
    left: ColorRecordEntity.Type,
    right: ColorRecordEntity.Type
  ): boolean {
    const leftP3 = left.displayP3;
    const rightP3 = right.displayP3;
    const leftHints = left.hints;
    const rightHints = right.hints;
    const sameP3 =
      leftP3?.r === rightP3?.r &&
      leftP3?.g === rightP3?.g &&
      leftP3?.b === rightP3?.b &&
      (leftP3 === undefined) === (rightP3 === undefined);
    const sameHints =
      leftHints?.intent === rightHints?.intent &&
      leftHints?.role === rightHints?.role &&
      leftHints?.weight === rightHints?.weight &&
      (leftHints === undefined) === (rightHints === undefined);
    const result =
      left === right ||
      (left.alpha === right.alpha &&
        left.hex === right.hex &&
        left.oklch.l === right.oklch.l &&
        left.oklch.c === right.oklch.c &&
        left.oklch.h === right.oklch.h &&
        left.rgb.r === right.rgb.r &&
        left.rgb.g === right.rgb.g &&
        left.rgb.b === right.rgb.b &&
        left.sourceFormat === right.sourceFormat &&
        sameP3 &&
        sameHints);
    return result;
  }
}

class ContrastBand {
  static passes(ratio: number, minimum: number, maximum: number | undefined): boolean {
    const result = ratio >= minimum && (maximum === undefined || ratio <= maximum);
    return result;
  }
}

class ContrastAdjustment {
  static notNeeded(): readonly [
    boolean,
    PendingContrastEntryEntity.Type['adjustmentDisposition']
  ] {
    const result: readonly [
      boolean,
      PendingContrastEntryEntity.Type['adjustmentDisposition']
    ] = [false, 'not-needed'];
    return result;
  }

  static preservedStated(): readonly [
    boolean,
    PendingContrastEntryEntity.Type['adjustmentDisposition']
  ] {
    const result: readonly [
      boolean,
      PendingContrastEntryEntity.Type['adjustmentDisposition']
    ] = [false, 'preserved-stated'];
    return result;
  }

  static unresolved(): readonly [
    boolean,
    PendingContrastEntryEntity.Type['adjustmentDisposition']
  ] {
    const result: readonly [
      boolean,
      PendingContrastEntryEntity.Type['adjustmentDisposition']
    ] = [false, 'unresolved'];
    return result;
  }

  static blockedStatedBoth(): readonly [
    boolean,
    PendingContrastEntryEntity.Type['adjustmentDisposition']
  ] {
    const result: readonly [
      boolean,
      PendingContrastEntryEntity.Type['adjustmentDisposition']
    ] = [false, 'blocked-stated-both'];
    return result;
  }

  static applied(): readonly [
    boolean,
    PendingContrastEntryEntity.Type['adjustmentDisposition']
  ] {
    const result: readonly [
      boolean,
      PendingContrastEntryEntity.Type['adjustmentDisposition']
    ] = [true, 'applied'];
    return result;
  }
}

class ContrastProvenance {
  static isStated(state: PaletteStateInterface, roleName: string): boolean {
    const result =
      Metadata.roleProvenance(state.metadata).get(roleName)?.origin ===
      'stated';
    return result;
  }

  static recordAdjustment(
    state: PaletteStateInterface,
    roleName: string,
    beforeHex: string,
    afterHex: string
  ): void {
    const provenance = Metadata.roleProvenance(state.metadata);
    const role =
      provenance.get(roleName) ??
      RoleProvenanceEntity.create({
        'adjustments': [],
        'origin': 'derived'
      });
    const nextRole = RoleProvenanceEntity.create({
      'adjustments': [
        ...role.adjustments,
        { 'afterHex': afterHex, 'beforeHex': beforeHex, 'operation': 'contrast' }
      ],
      'origin': role.origin
    });
    provenance.set(roleName, nextRole);
    Metadata.writeRoleProvenance(state.metadata, provenance);
  }
}

class ContrastMover {
  readonly 'counterpart': ColorRecordEntity.Type;
  readonly 'record': ColorRecordEntity.Type;
  readonly 'roleName': string;

  private constructor(
    roleName: string,
    record: ColorRecordEntity.Type,
    counterpart: ColorRecordEntity.Type
  ) {
    this.roleName = roleName;
    this.record = record;
    this.counterpart = counterpart;
  }

  static select(
    state: PaletteStateInterface,
    pair: ContrastPolicy.RequirementInterface,
    foreground: ColorRecordEntity.Type,
    background: ColorRecordEntity.Type
  ): ContrastMover | undefined {
    if (!ContrastProvenance.isStated(state, pair.foreground)) {
      return new ContrastMover(pair.foreground, foreground, background);
    }
    if (!ContrastProvenance.isStated(state, pair.background)) {
      return new ContrastMover(pair.background, background, foreground);
    }
    return undefined;
  }
}

interface ContrastPendingOptionsInterface {
  readonly 'adjustedRole'?: string;
  readonly 'maximumRatio'?: number;
}

class ContrastExecution {
  static queue(
    roles: PaletteRoleState,
    state: PaletteStateInterface,
    context: PipelineContextInterface,
    requirements: readonly ContrastPolicy.RequirementInterface[]
  ): PendingContrastEntryEntity.Type[] {
    const entries: (PendingContrastEntryEntity.Type | undefined)[] = [];
    const maximumPasses = Math.max(1, requirements.length * 2);
    for (let pass = 0; pass < maximumPasses; pass += 1) {
      let adjusted = false;
      for (let index = 0; index < requirements.length; index += 1) {
        const requirement = requirements[index];
        if (requirement === undefined) {
          continue;
        }
        const current = ContrastExecution.processPair(
          roles,
          state,
          context,
          requirement
        );
        if (current === undefined) {
          continue;
        }
        const previous = entries[index];
        const entry = ContrastExecution.mergeEntry(previous, current);
        entries[index] = entry;
        adjusted = adjusted || current.adjustmentDisposition === 'applied';
      }
      if (!adjusted) {
        break;
      }
    }
    const result: PendingContrastEntryEntity.Type[] = [];
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry !== undefined) {
        result.push(entry);
      }
    }
    return result;
  }

  private static mergeEntry(
    previous: PendingContrastEntryEntity.Type | undefined,
    current: PendingContrastEntryEntity.Type
  ): PendingContrastEntryEntity.Type {
    const adjusted = current.adjusted || previous?.adjusted === true;
    const adjustmentDisposition =
      adjusted && current.adjustmentDisposition === 'not-needed'
        ? 'applied'
        : current.adjustmentDisposition;
    const adjustedRole = current.adjustedRole ?? previous?.adjustedRole;
    const result = PendingContrastEntryEntity.create({
      'adjusted': adjusted,
      ...(adjustedRole === undefined ? {} : { 'adjustedRole': adjustedRole }),
      'adjustmentDisposition': adjustmentDisposition,
      'algo': current.algo,
      ...(current.maximumContrastRatio === undefined
        ? {}
        : { 'maximumContrastRatio': current.maximumContrastRatio }),
      'minimumContrastRatio': current.minimumContrastRatio,
      'pair': current.pair,
      'target': current.target
    });
    return result;
  }

  static report(
    roles: PaletteRoleState,
    pending: readonly PendingContrastEntryEntity.Type[],
    selection: ContrastPolicy.SelectionInterface
  ): ContrastReportEntity.Type {
    const pairs: ContrastReportEntryEntity.Type[] = [];
    let selectedAlgorithm = selection.algorithm;
    let target = selection.target;
    for (let index = 0; index < pending.length; index += 1) {
      const entry = pending[index];
      if (entry === undefined) {
        continue;
      }
      selectedAlgorithm = ContrastAlgorithmTypeEntity.intake(entry.algo);
      target = entry.target;
      const pair = ContrastExecution.reportEntry(roles, entry);
      if (pair !== undefined) {
        pairs.push(pair);
      }
    }
    const result = ContrastReportEntity.create({
      'compliant': pairs.every((pair) => {return pair.passed;}),
      'pairs': pairs,
      'selectedAlgorithm': selectedAlgorithm,
      'target': target
    });
    return result;
  }

  private static processPair(
    roles: PaletteRoleState,
    state: PaletteStateInterface,
    context: PipelineContextInterface,
    requirement: ContrastPolicy.RequirementInterface
  ): PendingContrastEntryEntity.Type | undefined {
    const foreground = roles.get(requirement.foreground);
    const background = roles.get(requirement.background);
    if (foreground === undefined || background === undefined) {
      ContrastExecution.logMissingPair(context, requirement);
      return undefined;
    }

    const algorithm = requirement.algorithm;
    const minimumRatio = requirement.minimumContrastRatio;
    const maximumRatio = requirement.maximumContrastRatio;
    const ratio = ContrastMeasurement.measure(
      algorithm,
      foreground,
      background
    );
    const passed = ContrastBand.passes(ratio, minimumRatio, maximumRatio);
    if (passed) {
      const result = ContrastExecution.pendingEntry(
        requirement,
        algorithm,
        minimumRatio,
        ContrastAdjustment.notNeeded,
        ...(maximumRatio === undefined ? [] : [{ 'maximumRatio': maximumRatio }])
      );
      return result;
    }

    const mover = ContrastMover.select(
      state,
      requirement,
      foreground,
      background
    );
    const message =
      mover === undefined
        ? 'Pair outside contrast band; preserving stated roles'
        : 'Pair outside contrast band; nudging derived role';
    ContrastExecution.logViolation(
      context,
      requirement,
      message,
      minimumRatio,
      maximumRatio,
      ratio
    );
    if (mover === undefined) {
      const result = ContrastExecution.pendingEntry(
        requirement,
        algorithm,
        minimumRatio,
        ContrastAdjustment.blockedStatedBoth,
        ...(maximumRatio === undefined ? [] : [{ 'maximumRatio': maximumRatio }])
      );
      return result;
    }

    const resolved = ContrastExecution.resolveMover(
      mover,
      state,
      algorithm,
      minimumRatio,
      maximumRatio
    );
    const resolvedForeground =
      mover.roleName === requirement.foreground ? resolved : foreground;
    const resolvedBackground =
      mover.roleName === requirement.background ? resolved : background;
    const resolvedRatio = ContrastMeasurement.measure(
      algorithm,
      resolvedForeground,
      resolvedBackground
    );
    const resolvedPassed = ContrastBand.passes(
      resolvedRatio,
      minimumRatio,
      maximumRatio
    );
    if (
      !resolvedPassed ||
      !ContrastPolicy.allowsRoleRecord(state.input, mover.roleName, resolved) ||
      ContrastMeasurement.sameRecord(resolved, mover.record)
    ) {
      const result = ContrastExecution.pendingEntry(
        requirement,
        algorithm,
        minimumRatio,
        ContrastAdjustment.unresolved,
        ...(maximumRatio === undefined ? [] : [{ 'maximumRatio': maximumRatio }])
      );
      return result;
    }
    roles.set(mover.roleName, resolved);
    ContrastProvenance.recordAdjustment(
      state,
      mover.roleName,
      mover.record.hex,
      resolved.hex
    );
    const result = ContrastExecution.pendingEntry(
      requirement,
      algorithm,
      minimumRatio,
      ContrastAdjustment.applied,
      { 'adjustedRole': mover.roleName, ...(maximumRatio === undefined ? {} : { 'maximumRatio': maximumRatio }) }
    );
    return result;
  }

  private static resolveMover(
    mover: ContrastMover,
    state: PaletteStateInterface,
    algorithm: ContrastAlgorithmTypeEntity.Type,
    minimumRatio: number,
    maximumRatio: number | undefined
  ): ColorRecordEntity.Type {
    const roleRange = ContrastPolicy.roleRange(state.input, mover.roleName);
    const result = ensureContrast.apply(
      mover.record,
      mover.counterpart,
      minimumRatio,
      {
        'algorithm': algorithm,
        ...(roleRange.lightnessRange === undefined
          ? {}
          : { 'lightnessRange': roleRange.lightnessRange }),
        ...(maximumRatio === undefined ? {} : { 'maximumRatio': maximumRatio })
      }
    );
    return result;
  }

  private static pendingEntry(
    requirement: ContrastPolicy.RequirementInterface,
    algorithm: ContrastAlgorithmTypeEntity.Type,
    minimumRatio: number,
    resolveAdjustment: () => readonly [
      boolean,
      PendingContrastEntryEntity.Type['adjustmentDisposition']
    ],
    options: ContrastPendingOptionsInterface = {}
  ): PendingContrastEntryEntity.Type {
    const [adjusted, adjustmentDisposition] = resolveAdjustment();
    const adjustedRole = options.adjustedRole;
    const maximumRatio = options.maximumRatio;
    const result = PendingContrastEntryEntity.create({
      'adjusted': adjusted,
      ...(adjustedRole === undefined ? {} : { 'adjustedRole': adjustedRole }),
      'adjustmentDisposition': adjustmentDisposition,
      'algo': algorithm,
      ...(maximumRatio === undefined
        ? {}
        : { 'maximumContrastRatio': maximumRatio }),
      'minimumContrastRatio': minimumRatio,
      'pair': ContrastPairEntity.create({
        'algorithm': requirement.algorithm,
        'background': requirement.background,
        'foreground': requirement.foreground,
        ...(requirement.maximumContrastRatio === undefined
          ? {}
          : { 'maximumContrastRatio': requirement.maximumContrastRatio }),
        'minimumContrastRatio': requirement.minimumContrastRatio
      }),
      'target': requirement.target
    });
    return result;
  }

  private static logMissingPair(
    context: PipelineContextInterface,
    requirement: ContrastPolicy.RequirementInterface
  ): void {
    context.logger.warn(
      LogBody.create({
        'component': 'EnforceContrast',
        'context': {
          'background': requirement.background,
          'foreground': requirement.foreground
        },
        'message': 'Contrast pair has missing role(s)',
        'operation': 'run',
        'status': LOG_STATUS.INVALID
      })
    );
  }

  private static logViolation(
    context: PipelineContextInterface,
    requirement: ContrastPolicy.RequirementInterface,
    message: string,
    minimumRatio: number,
    maximumRatio: number | undefined,
    ratio: number
  ): void {
    context.logger.info(
      LogBody.create({
        'component': 'EnforceContrast',
        'context': {
          'background': requirement.background,
          'foreground': requirement.foreground,
          'maximumContrastRatio': maximumRatio,
          'minimumContrastRatio': minimumRatio,
          'ratio': ratio
        },
        'message': message,
        'operation': 'run',
        'status': LOG_STATUS.PARTIAL
      })
    );
  }

  private static reportEntry(
    roles: PaletteRoleState,
    entry: PendingContrastEntryEntity.Type
  ): ContrastReportEntryEntity.Type | undefined {
    const foreground = roles.get(entry.pair.foreground);
    const background = roles.get(entry.pair.background);
    if (foreground === undefined || background === undefined) {
      return undefined;
    }
    const actual = ContrastMeasurement.measure(
      ContrastAlgorithmTypeEntity.intake(entry.algo),
      foreground,
      background
    );
    const passed = ContrastBand.passes(
      actual,
      entry.minimumContrastRatio,
      entry.maximumContrastRatio
    );
    let disposition: ContrastReportEntryEntity.Type['disposition'] = 'unresolved';
    if (entry.adjustmentDisposition === 'not-needed') {
      disposition = 'not-needed';
    } else if (entry.adjustmentDisposition === 'applied') {
      disposition = entry.adjustedRole === entry.pair.foreground
        ? 'adjusted-foreground'
        : 'adjusted-background';
    } else if (
      entry.adjustmentDisposition === 'preserved-stated' ||
      entry.adjustmentDisposition === 'blocked-stated-both'
    ) {
      disposition = 'blocked-stated';
    }
    const result = ContrastReportEntryEntity.create({
      'actual': actual,
      ...(entry.adjustedRole === undefined
        ? {}
        : { 'adjustedRole': entry.adjustedRole }),
      'background': entry.pair.background,
      'disposition': disposition,
      'foreground': entry.pair.foreground,
      'passed': passed,
      'required': entry.minimumContrastRatio
    });
    return result;
  }
}

class EnforceContrast implements TaskInterface {
  readonly 'name' = 'enforce:contrast';

  readonly 'manifest': TaskManifestEntity.Type =
    TaskManifestEntity.create({
      'description':
        'Checks foreground role colors against each contrast-pair ratio band, preserving caller-stated colors and recording adjustments to derived colors.',
      'name': 'enforce:contrast',
      'reads': [
        'roles',
        'input.roles',
        'input.contrast',
        "metadata['core:roleProvenance']"
      ],
      'requires': ['contrastWcag21', 'contrastApca', 'ensureContrast'],
      'writes': [
        'roles',
        "metadata['core:contrastReport']",
        "metadata['core:roleProvenance']"
      ]
    });

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const roles = PaletteRoleState.admit(state.roles);
    const selection = ContrastPolicy.selection(state.input);
    const requirements = ContrastPolicy.normalize(state.input, roles);
    const pending = ContrastExecution.queue(
      roles,
      state,
      context,
      requirements
    );
    const report = ContrastExecution.report(roles, pending, selection);
    roles.commit();
    Metadata.writeContrastReport(state.metadata, report);
  }
}

/** Singleton instance registered as the `enforce:contrast` pipeline task. */
export const enforceContrast = new EnforceContrast();
