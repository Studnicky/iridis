import type { CanonicalShapeType } from '@studnicky/json-tology/types';

import { LOG_STATUS, LogBody } from '@studnicky/logger/node';

import type { ColorRecordInterfaceTypeEntity } from '../../entities/ColorRecordInterfaceTypeEntity.ts';
import type { PipelineContextInterface } from '../../interfaces/PipelineContextInterface.ts';
import type { TaskInterface } from '../../interfaces/TaskInterface.ts';

import { ContrastAlgorithmTypeEntity } from '../../entities/ContrastAlgorithmTypeEntity.ts';
import { ContrastPairInterfaceTypeEntity } from '../../entities/ContrastPairInterfaceTypeEntity.ts';
import { ContrastReportEntryInterfaceTypeEntity } from '../../entities/ContrastReportEntryInterfaceTypeEntity.ts';
import { PendingContrastEntryInterfaceTypeEntity } from '../../entities/PendingContrastEntryInterfaceTypeEntity.ts';
import { RoleProvenanceInterfaceTypeEntity } from '../../entities/RoleProvenanceInterfaceTypeEntity.ts';
import { TaskManifestInterfaceTypeEntity } from '../../entities/TaskManifestInterfaceTypeEntity.ts';
import { PaletteRoleState, type PaletteStateInterface } from '../../interfaces/PaletteStateInterface.ts';
import { contrastApca }   from '../../math/ContrastApca.ts';
import { contrastWcag21 } from '../../math/ContrastWcag21.ts';
import { ensureContrast } from '../../math/EnsureContrast.ts';
import { Metadata } from '../../types/metadata.ts';

class ContrastMeasurement {
  static measure(
    algorithm: ContrastAlgorithmTypeEntity.Type,
    foreground: ColorRecordInterfaceTypeEntity.Type,
    background: ColorRecordInterfaceTypeEntity.Type
  ): number {
    if (algorithm === 'apca') {
      const result = Math.abs(contrastApca.apply(foreground, background));
      return result;
    }
    const result = contrastWcag21.apply(foreground, background);
    return result;
  }

  static levelFloor(level: string | undefined): number {
    let result = 1;
    if (level === 'AAA') {
      result = 7;
    } else if (level === 'AA') {
      result = 4.5;
    }
    return result;
  }

  static sameRecord(left: ColorRecordInterfaceTypeEntity.Type, right: ColorRecordInterfaceTypeEntity.Type): boolean {
    const leftP3 = left.displayP3;
    const rightP3 = right.displayP3;
    const leftHints = left.hints;
    const rightHints = right.hints;
    const sameP3 = leftP3?.r === rightP3?.r
      && leftP3?.g === rightP3?.g
      && leftP3?.b === rightP3?.b
      && (leftP3 === undefined) === (rightP3 === undefined);
    const sameHints = leftHints?.intent === rightHints?.intent
      && leftHints?.role === rightHints?.role
      && leftHints?.weight === rightHints?.weight
      && (leftHints === undefined) === (rightHints === undefined);
    const result = left === right || (
      left.alpha === right.alpha
      && left.hex === right.hex
      && left.oklch.l === right.oklch.l
      && left.oklch.c === right.oklch.c
      && left.oklch.h === right.oklch.h
      && left.rgb.r === right.rgb.r
      && left.rgb.g === right.rgb.g
      && left.rgb.b === right.rgb.b
      && left.sourceFormat === right.sourceFormat
      && sameP3
      && sameHints
    );
    return result;
  }
}

class ContrastAdjustment {
  static notNeeded(): readonly [boolean, PendingContrastEntryInterfaceTypeEntity.Type['adjustmentDisposition']] {
    const result: readonly [boolean, PendingContrastEntryInterfaceTypeEntity.Type['adjustmentDisposition']] = [false, 'not-needed'];
    return result;
  }

  static preservedStated(): readonly [boolean, PendingContrastEntryInterfaceTypeEntity.Type['adjustmentDisposition']] {
    const result: readonly [boolean, PendingContrastEntryInterfaceTypeEntity.Type['adjustmentDisposition']] = [false, 'preserved-stated'];
    return result;
  }

  static unresolved(): readonly [boolean, PendingContrastEntryInterfaceTypeEntity.Type['adjustmentDisposition']] {
    const result: readonly [boolean, PendingContrastEntryInterfaceTypeEntity.Type['adjustmentDisposition']] = [false, 'unresolved'];
    return result;
  }

  static applied(): readonly [boolean, PendingContrastEntryInterfaceTypeEntity.Type['adjustmentDisposition']] {
    const result: readonly [boolean, PendingContrastEntryInterfaceTypeEntity.Type['adjustmentDisposition']] = [true, 'applied'];
    return result;
  }
}

class ContrastProvenance {
  static isStated(state: PaletteStateInterface, roleName: string): boolean {
    const result = Metadata.roleProvenance(state.metadata).get(roleName)?.origin === 'stated';
    return result;
  }

  static recordAdjustment(
    state: PaletteStateInterface,
    roleName: string,
    beforeHex: string,
    afterHex: string
  ): void {
    const provenance = Metadata.roleProvenance(state.metadata);
    const role = provenance.get(roleName) ?? RoleProvenanceInterfaceTypeEntity.create({
      'adjustments': [],
      'origin':      'derived'
    });
    const nextRole = RoleProvenanceInterfaceTypeEntity.create({
      'adjustments': [...role.adjustments, { 'afterHex': afterHex, 'beforeHex': beforeHex, 'operation': 'contrast' }],
      'origin':      role.origin
    });
    provenance.set(roleName, nextRole);
    Metadata.writeRoleProvenance(state.metadata, provenance);
  }
}

class ContrastExecution {
  static normalizePairs(
    schemaPairs: readonly CanonicalShapeType<typeof ContrastPairInterfaceTypeEntity.Schema>[],
    extraPairs: readonly CanonicalShapeType<typeof ContrastPairInterfaceTypeEntity.Schema>[]
  ): readonly ContrastPairInterfaceTypeEntity.Type[] {
    const sourcePairs = [...schemaPairs, ...extraPairs];
    const result: ContrastPairInterfaceTypeEntity.Type[] = [];
    for (let index = 0; index < sourcePairs.length; index += 1) {
      const candidate = sourcePairs[index];
      if (candidate !== undefined) {
        result.push(ContrastPairInterfaceTypeEntity.intake(candidate));
      }
    }
    return result;
  }

  static queue(
    roles: PaletteRoleState,
    state: PaletteStateInterface,
    context: PipelineContextInterface,
    pairs: readonly ContrastPairInterfaceTypeEntity.Type[],
    defaultAlgorithm: ContrastAlgorithmTypeEntity.Type,
    minimumFloor: number
  ): PendingContrastEntryInterfaceTypeEntity.Type[] {
    const result: PendingContrastEntryInterfaceTypeEntity.Type[] = [];
    for (let index = 0; index < pairs.length; index += 1) {
      const pair = pairs[index];
      if (pair !== undefined) {
        const entry = ContrastExecution.processPair(roles, state, context, pair, defaultAlgorithm, minimumFloor);
        if (entry !== undefined) {
          result.push(entry);
        }
      }
    }
    return result;
  }

  static report(
    roles: PaletteRoleState,
    pending: readonly PendingContrastEntryInterfaceTypeEntity.Type[]
  ): ContrastReportEntryInterfaceTypeEntity.Type[] {
    const result: ContrastReportEntryInterfaceTypeEntity.Type[] = [];
    for (let index = 0; index < pending.length; index += 1) {
      const entry = pending[index];
      if (entry !== undefined) {
        const reportEntry = ContrastExecution.reportEntry(roles, entry);
        if (reportEntry !== undefined) {
          result.push(reportEntry);
        }
      }
    }
    return result;
  }

  private static processPair(
    roles: PaletteRoleState,
    state: PaletteStateInterface,
    context: PipelineContextInterface,
    pair: ContrastPairInterfaceTypeEntity.Type,
    defaultAlgorithm: ContrastAlgorithmTypeEntity.Type,
    minimumFloor: number
  ): PendingContrastEntryInterfaceTypeEntity.Type | undefined {
    const foreground = roles.get(pair.foreground);
    const background = roles.get(pair.background);
    if (foreground === undefined || background === undefined) {
      ContrastExecution.logMissingPair(context, pair);
      return undefined;
    }

    const algorithm = ContrastAlgorithmTypeEntity.intake(pair.algorithm ?? defaultAlgorithm);
    const minimumRatio = pair.minimumContrastRatio === undefined
      ? minimumFloor
      : Math.max(pair.minimumContrastRatio, minimumFloor);
    const maximumRatio = pair.maximumContrastRatio;
    const ratio = ContrastMeasurement.measure(algorithm, foreground, background);
    const passed = ratio >= minimumRatio && (maximumRatio === undefined || ratio <= maximumRatio);
    if (passed) {
      const result = ContrastExecution.pendingEntry(pair, algorithm, minimumRatio, maximumRatio, ContrastAdjustment.notNeeded);
      return result;
    }

    const stated = ContrastProvenance.isStated(state, pair.foreground);
    const message = stated
      ? 'Pair outside contrast band; preserving stated foreground'
      : 'Pair outside contrast band; nudging';
    ContrastExecution.logViolation(context, pair, message, minimumRatio, maximumRatio, ratio);
    if (stated) {
      const result = ContrastExecution.pendingEntry(pair, algorithm, minimumRatio, maximumRatio, ContrastAdjustment.preservedStated);
      return result;
    }

    const resolved = ensureContrast.apply(foreground, background, minimumRatio, {
      'algorithm': algorithm,
      ...(maximumRatio === undefined ? {} : { 'maximumRatio': maximumRatio })
    });
    const resolvedRatio = ContrastMeasurement.measure(algorithm, resolved, background);
    const resolvedPassed = resolvedRatio >= minimumRatio
      && (maximumRatio === undefined || resolvedRatio <= maximumRatio);
    if (!resolvedPassed || ContrastMeasurement.sameRecord(resolved, foreground)) {
      const result = ContrastExecution.pendingEntry(pair, algorithm, minimumRatio, maximumRatio, ContrastAdjustment.unresolved);
      return result;
    }
    roles.set(pair.foreground, resolved);
    ContrastProvenance.recordAdjustment(state, pair.foreground, foreground.hex, resolved.hex);
    const result = ContrastExecution.pendingEntry(pair, algorithm, minimumRatio, maximumRatio, ContrastAdjustment.applied);
    return result;
  }

  private static pendingEntry(
    pair: ContrastPairInterfaceTypeEntity.Type,
    algorithm: ContrastAlgorithmTypeEntity.Type,
    minimumRatio: number,
    maximumRatio: number | undefined,
    resolveAdjustment: () => readonly [boolean, PendingContrastEntryInterfaceTypeEntity.Type['adjustmentDisposition']]
  ): PendingContrastEntryInterfaceTypeEntity.Type {
    const [adjusted, adjustmentDisposition] = resolveAdjustment();
    const result = PendingContrastEntryInterfaceTypeEntity.create({
      'adjusted':              adjusted,
      'adjustmentDisposition': adjustmentDisposition,
      'algo':                  algorithm,
      ...(maximumRatio === undefined ? {} : { 'maximumContrastRatio': maximumRatio }),
      'minimumContrastRatio': minimumRatio,
      'pair':     pair
    });
    return result;
  }

  private static logMissingPair(
    context: PipelineContextInterface,
    pair: ContrastPairInterfaceTypeEntity.Type
  ): void {
    context.logger.warn(LogBody.create({
      'component': 'EnforceContrast',
      'context': {
        'background': pair.background,
        'foreground': pair.foreground
      },
      'message': 'Contrast pair has missing role(s)',
      'operation': 'run',
      'status': LOG_STATUS.INVALID
    }));
  }

  private static logViolation(
    context: PipelineContextInterface,
    pair: ContrastPairInterfaceTypeEntity.Type,
    message: string,
    minimumRatio: number,
    maximumRatio: number | undefined,
    ratio: number
  ): void {
    context.logger.info(LogBody.create({
      'component': 'EnforceContrast',
      'context': {
        'background': pair.background,
        'foreground': pair.foreground,
        'maximumContrastRatio': maximumRatio,
        'minimumContrastRatio': minimumRatio,
        'ratio':      ratio
      },
      'message': message,
      'operation': 'run',
      'status': LOG_STATUS.PARTIAL
    }));
  }

  private static reportEntry(
    roles: PaletteRoleState,
    entry: PendingContrastEntryInterfaceTypeEntity.Type
  ): ContrastReportEntryInterfaceTypeEntity.Type | undefined {
    const foreground = roles.get(entry.pair.foreground);
    const background = roles.get(entry.pair.background);
    if (foreground === undefined || background === undefined) {
      return undefined;
    }
    const algorithm = ContrastAlgorithmTypeEntity.intake(entry.algo);
    const ratio = ContrastMeasurement.measure(algorithm, foreground, background);
    const result = ContrastReportEntryInterfaceTypeEntity.create({
      'adjusted':              entry.adjusted,
      'adjustmentDisposition': entry.adjustmentDisposition,
      'algorithm':             entry.algo,
      'background': entry.pair.background,
      'foreground': entry.pair.foreground,
      'minimumContrastRatio': entry.minimumContrastRatio,
      ...(entry.maximumContrastRatio === undefined ? {} : { 'maximumContrastRatio': entry.maximumContrastRatio }),
      'passed':               ratio >= entry.minimumContrastRatio && (entry.maximumContrastRatio === undefined || ratio <= entry.maximumContrastRatio),
      'ratio':      ratio
    });
    return result;
  }
}

class EnforceContrast implements TaskInterface {
  readonly 'name' = 'enforce:contrast';

  readonly 'manifest': TaskManifestInterfaceTypeEntity.Type = TaskManifestInterfaceTypeEntity.create({
    'description': 'Checks foreground role colors against each contrast-pair ratio band, preserving caller-stated colors and recording adjustments to derived colors.',
    'name':        'enforce:contrast',
    'reads':       ['roles', 'input.roles', 'input.contrast', 'metadata[\'core:roleProvenance\']'],
    'requires':    ['contrastWcag21', 'contrastApca', 'ensureContrast'],
    'writes':      ['roles', 'metadata[\'core:contrastReport\']', 'metadata[\'core:roleProvenance\']']
  });

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const schemaPairs = state.input.roles?.contrastPairs ?? [];
    const extraPairs = state.input.contrast?.extra ?? [];
    const pairs = ContrastExecution.normalizePairs(schemaPairs, extraPairs);
    if (pairs.length === 0) {
      return;
    }
    const roles = PaletteRoleState.admit(state.roles);
    const defaultAlgorithm = ContrastAlgorithmTypeEntity.intake(state.input.contrast?.algorithm ?? 'wcag21');
    const minimumFloor = ContrastMeasurement.levelFloor(state.input.contrast?.level);
    const pending = ContrastExecution.queue(roles, state, context, pairs, defaultAlgorithm, minimumFloor);
    const report = ContrastExecution.report(roles, pending);
    roles.commit();
    state.metadata['core:contrastReport'] = report;
  }
}

/** Singleton instance registered as the `enforce:contrast` pipeline task. */
export const enforceContrast = new EnforceContrast();
