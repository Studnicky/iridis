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
import { colorRecordFactory } from '../../math/ColorRecordFactory.ts';
import { contrastApca } from '../../math/ContrastApca.ts';
import { contrastWcag21 } from '../../math/ContrastWcag21.ts';
import { deltaE2000 } from '../../math/DeltaE2000.ts';
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

  static shortfall(ratio: number, minimum: number, maximum: number | undefined): number {
    const lower = Math.max(0, minimum - ratio);
    const upper = maximum === undefined ? 0 : Math.max(0, ratio - maximum);
    const result = Math.max(lower, upper);
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

class ContrastPreference {
  static capture(state: PaletteStateInterface): ReadonlyMap<string, ColorRecordEntity.Type> {
    const colorsByHex = new Map<string, ColorRecordEntity.Type>();
    for (let index = 0; index < state.colors.length; index += 1) {
      const color = state.colors[index];
      if (color !== undefined) {
        colorsByHex.set(color.hex.toLowerCase(), color);
      }
    }
    const distances = Metadata.roleDistances(state.metadata);
    const preferences = new Map<string, ColorRecordEntity.Type>();
    const roleEntries = Object.entries(state.roles);
    for (let index = 0; index < roleEntries.length; index += 1) {
      const entry = roleEntries[index];
      if (entry === undefined) {
        continue;
      }
      const [roleName, record] = entry;
      const sourceHex = ContrastPreference.nearestSourceHex(distances.get(roleName));
      const source = sourceHex === undefined ? undefined : colorsByHex.get(sourceHex.toLowerCase());
      const preference = source === undefined
        ? record
        : colorRecordFactory.fromOklch(
          source.oklch.l,
          source.oklch.c,
          record.oklch.h,
          { 'alpha': record.alpha, 'hints': record.hints, 'origin': record }
        );
      preferences.set(roleName, preference);
    }
    return preferences;
  }

  private static nearestSourceHex(distances: ReadonlyMap<string, number> | undefined): string | undefined {
    let nearestDistance = Number.POSITIVE_INFINITY;
    let nearestHex: string | undefined;
    if (distances === undefined) {
      return nearestHex;
    }
    for (const [hex, distance] of distances) {
      if (distance < nearestDistance ||
        (distance === nearestDistance && (nearestHex === undefined || hex.localeCompare(nearestHex) < 0))) {
        nearestDistance = distance;
        nearestHex = hex;
      }
    }
    return nearestHex;
  }
}

class ContrastCoordinateScore {
  readonly 'failureCount': number;
  readonly 'maximumShortfall': number;
  readonly 'totalDisplacement': number;
  readonly 'totalShortfall': number;

  constructor(
    failureCount: number,
    maximumShortfall: number,
    totalShortfall: number,
    totalDisplacement: number
  ) {
    this.failureCount = failureCount;
    this.maximumShortfall = maximumShortfall;
    this.totalShortfall = totalShortfall;
    this.totalDisplacement = totalDisplacement;
  }

  static compare(left: ContrastCoordinateScore, right: ContrastCoordinateScore): number {
    const dimensions: readonly (readonly [number, number])[] = [
      [left.failureCount, right.failureCount],
      [left.maximumShortfall, right.maximumShortfall],
      [left.totalShortfall, right.totalShortfall],
      [left.totalDisplacement, right.totalDisplacement]
    ];
    for (let index = 0; index < dimensions.length; index += 1) {
      const dimension = dimensions[index];
      if (dimension === undefined) {
        continue;
      }
      const difference = dimension[0] - dimension[1];
      if (Math.abs(difference) > 1e-12) {
        return difference;
      }
    }
    return 0;
  }
}

interface ContrastPendingOptionsInterface {
  readonly 'adjustedRole'?: string;
  readonly 'causes'?: readonly string[];
  readonly 'maximumRatio'?: number;
}

class ContrastExecution {
  static queue(
    roles: PaletteRoleState,
    state: PaletteStateInterface,
    context: PipelineContextInterface,
    requirements: readonly ContrastPolicy.RequirementInterface[]
  ): PendingContrastEntryEntity.Type[] {
    ContrastExecution.optimizeCoordinates(roles, state, requirements);
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

  private static optimizeCoordinates(
    roles: PaletteRoleState,
    state: PaletteStateInterface,
    requirements: readonly ContrastPolicy.RequirementInterface[]
  ): void {
    const preferences = ContrastPreference.capture(state);
    const components = ContrastExecution.components(requirements);
    for (let componentIndex = 0; componentIndex < components.length; componentIndex += 1) {
      const component = components[componentIndex];
      if (component !== undefined) {
        ContrastExecution.optimizeComponent(roles, state, preferences, component);
      }
    }
  }

  private static optimizeComponent(
    roles: PaletteRoleState,
    state: PaletteStateInterface,
    preferences: ReadonlyMap<string, ColorRecordEntity.Type>,
    component: readonly ContrastPolicy.RequirementInterface[]
  ): void {
    const roleNames = ContrastExecution.componentRoleNames(component);
    const initial = ContrastExecution.componentRecords(roles, roleNames);
    let best = ContrastExecution.coordinateScore(roles, preferences, component);
    let bestRecords: ReadonlyMap<string, ColorRecordEntity.Type> = new Map(initial);
    const maximumPasses = Math.min(12, Math.max(1, roleNames.length * 2));
    for (let pass = 0; pass < maximumPasses; pass += 1) {
      const score = ContrastExecution.optimizePass(
        roles,
        state,
        preferences,
        component,
        roleNames,
        best
      );
      if (ContrastCoordinateScore.compare(score, best) >= 0) {
        break;
      }
      best = score;
      bestRecords = ContrastExecution.componentRecords(roles, roleNames);
    }
    ContrastExecution.restoreComponent(roles, state, roleNames, initial, bestRecords);
  }

  private static componentRecords(
    roles: PaletteRoleState,
    roleNames: readonly string[]
  ): ReadonlyMap<string, ColorRecordEntity.Type> {
    const records = new Map<string, ColorRecordEntity.Type>();
    for (let index = 0; index < roleNames.length; index += 1) {
      const roleName = roleNames[index];
      if (roleName === undefined) {
        continue;
      }
      const record = roles.get(roleName);
      if (record !== undefined) {
        records.set(roleName, record);
      }
    }
    return records;
  }

  private static optimizePass(
    roles: PaletteRoleState,
    state: PaletteStateInterface,
    preferences: ReadonlyMap<string, ColorRecordEntity.Type>,
    component: readonly ContrastPolicy.RequirementInterface[],
    roleNames: readonly string[],
    initialScore: ContrastCoordinateScore
  ): ContrastCoordinateScore {
    let score = initialScore;
    for (let index = 0; index < roleNames.length; index += 1) {
      const roleName = roleNames[index];
      if (roleName === undefined || ContrastProvenance.isStated(state, roleName)) {
        continue;
      }
      const current = roles.get(roleName);
      if (current === undefined) {
        continue;
      }
      const selected = ContrastExecution.coordinateCandidate(
        roles,
        state,
        preferences,
        component,
        roleName,
        current,
        score
      );
      if (selected !== undefined) {
        roles.set(roleName, selected);
        score = ContrastExecution.coordinateScore(roles, preferences, component);
      }
    }
    return score;
  }

  private static restoreComponent(
    roles: PaletteRoleState,
    state: PaletteStateInterface,
    roleNames: readonly string[],
    initial: ReadonlyMap<string, ColorRecordEntity.Type>,
    bestRecords: ReadonlyMap<string, ColorRecordEntity.Type>
  ): void {
    for (let index = 0; index < roleNames.length; index += 1) {
      const roleName = roleNames[index];
      if (roleName === undefined) {
        continue;
      }
      const original = initial.get(roleName);
      const resolved = bestRecords.get(roleName);
      if (original === undefined || resolved === undefined) {
        continue;
      }
      roles.set(roleName, resolved);
      if (!ContrastMeasurement.sameRecord(original, resolved)) {
        ContrastProvenance.recordAdjustment(state, roleName, original.hex, resolved.hex);
      }
    }
  }

  private static components(
    requirements: readonly ContrastPolicy.RequirementInterface[]
  ): readonly (readonly ContrastPolicy.RequirementInterface[])[] {
    const remaining = new Set(requirements);
    const result: ContrastPolicy.RequirementInterface[][] = [];
    while (remaining.size > 0) {
      const seed = remaining.values().next().value;
      if (seed === undefined) {
        break;
      }
      remaining.delete(seed);
      const component: ContrastPolicy.RequirementInterface[] = [seed];
      const roleNames = new Set([seed.background, seed.foreground]);
      let expanded = true;
      while (expanded) {
        expanded = false;
        const candidates = Array.from(remaining);
        for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex += 1) {
          const candidate = candidates[candidateIndex];
          if (candidate === undefined ||
            (!roleNames.has(candidate.foreground) && !roleNames.has(candidate.background))) {
            continue;
          }
          remaining.delete(candidate);
          component.push(candidate);
          roleNames.add(candidate.foreground);
          roleNames.add(candidate.background);
          expanded = true;
        }
      }
      result.push(component);
    }
    return result;
  }

  private static componentRoleNames(
    component: readonly ContrastPolicy.RequirementInterface[]
  ): readonly string[] {
    const roleNames = new Set<string>();
    for (let index = 0; index < component.length; index += 1) {
      const requirement = component[index];
      if (requirement !== undefined) {
        roleNames.add(requirement.foreground);
        roleNames.add(requirement.background);
      }
    }
    const result = Array.from(roleNames);
    result.sort(ContrastExecution.compareStrings);
    return result;
  }

  private static coordinateCandidate(
    roles: PaletteRoleState,
    state: PaletteStateInterface,
    preferences: ReadonlyMap<string, ColorRecordEntity.Type>,
    component: readonly ContrastPolicy.RequirementInterface[],
    roleName: string,
    current: ColorRecordEntity.Type,
    baseline: ContrastCoordinateScore
  ): ColorRecordEntity.Type | undefined {
    const candidates = ContrastExecution.coordinateCandidates(state, roleName, current);
    let selected: ColorRecordEntity.Type | undefined;
    let selectedScore: ContrastCoordinateScore | undefined;
    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = candidates[index];
      if (candidate === undefined || ContrastMeasurement.sameRecord(current, candidate)) {
        continue;
      }
      roles.set(roleName, candidate);
      const score = ContrastExecution.coordinateScore(roles, preferences, component);
      roles.set(roleName, current);
      if (ContrastCoordinateScore.compare(score, baseline) >= 0 ||
        (selectedScore !== undefined && ContrastCoordinateScore.compare(score, selectedScore) >= 0)) {
        continue;
      }
      selected = candidate;
      selectedScore = score;
    }
    return selected;
  }

  private static coordinateCandidates(
    state: PaletteStateInterface,
    roleName: string,
    current: ColorRecordEntity.Type
  ): readonly ColorRecordEntity.Type[] {
    const range = ContrastPolicy.roleRange(state.input, roleName);
    const lightnessRange = range.lightnessRange ?? [current.oklch.l, current.oklch.l] as const;
    const chromaRange = range.chromaRange ?? [current.oklch.c, current.oklch.c] as const;
    const lightnesses = ContrastExecution.coordinateValues(current.oklch.l, lightnessRange);
    const chromas = ContrastExecution.coordinateValues(current.oklch.c, chromaRange);
    const result: ColorRecordEntity.Type[] = [];
    for (let lightnessIndex = 0; lightnessIndex < lightnesses.length; lightnessIndex += 1) {
      const lightness = lightnesses[lightnessIndex];
      if (lightness === undefined) {
        continue;
      }
      for (let chromaIndex = 0; chromaIndex < chromas.length; chromaIndex += 1) {
        const chroma = chromas[chromaIndex];
        if (chroma === undefined) {
          continue;
        }
        const candidate = colorRecordFactory.fromOklch(
          lightness,
          chroma,
          current.oklch.h,
          { 'alpha': current.alpha, 'hints': current.hints, 'origin': current }
        );
        if (ContrastPolicy.allowsRoleRecord(state.input, roleName, candidate)) {
          result.push(candidate);
        }
      }
    }
    return result;
  }

  private static coordinateScore(
    roles: PaletteRoleState,
    preferences: ReadonlyMap<string, ColorRecordEntity.Type>,
    component: readonly ContrastPolicy.RequirementInterface[]
  ): ContrastCoordinateScore {
    const roleNames = ContrastExecution.componentRoleNames(component);
    let failureCount = 0;
    let maximumShortfall = 0;
    let totalShortfall = 0;
    for (let index = 0; index < component.length; index += 1) {
      const requirement = component[index];
      if (requirement === undefined) {
        continue;
      }
      const foreground = roles.get(requirement.foreground);
      const background = roles.get(requirement.background);
      if (foreground === undefined || background === undefined) {
        continue;
      }
      const ratio = ContrastMeasurement.measure(requirement.algorithm, foreground, background);
      const shortfall = ContrastBand.shortfall(
        ratio,
        requirement.minimumContrastRatio,
        requirement.maximumContrastRatio
      );
      if (shortfall > 1e-12) {
        failureCount += 1;
        maximumShortfall = Math.max(maximumShortfall, shortfall);
        totalShortfall += shortfall;
      }
    }
    let totalDisplacement = 0;
    for (let index = 0; index < roleNames.length; index += 1) {
      const roleName = roleNames[index];
      if (roleName === undefined) {
        continue;
      }
      const record = roles.get(roleName);
      const preference = preferences.get(roleName);
      if (record !== undefined && preference !== undefined) {
        totalDisplacement += deltaE2000.apply(preference, record);
      }
    }
    return new ContrastCoordinateScore(
      failureCount,
      maximumShortfall,
      totalShortfall,
      totalDisplacement
    );
  }

  private static coordinateValues(
    current: number,
    range: readonly [number, number]
  ): readonly number[] {
    const [minimum, maximum] = range;
    const candidates = [
      current,
      minimum,
      maximum,
      minimum + (maximum - minimum) * 0.25,
      minimum + (maximum - minimum) * 0.5,
      minimum + (maximum - minimum) * 0.75
    ];
    const values = new Set<number>();
    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = candidates[index];
      if (candidate !== undefined) {
        values.add(Math.max(minimum, Math.min(maximum, candidate)));
      }
    }
    const result = Array.from(values);
    result.sort(ContrastExecution.compareNumbers);
    return result;
  }

  private static compareNumbers(left: number, right: number): number {
    const result = left - right;
    return result;
  }

  private static compareStrings(left: string, right: string): number {
    const result = left.localeCompare(right);
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
    const causes =
      current.adjustmentDisposition === 'not-needed' ||
      current.adjustmentDisposition === 'applied'
        ? []
        : current.causes;
    const result = PendingContrastEntryEntity.create({
      'adjusted': adjusted,
      ...(adjustedRole === undefined ? {} : { 'adjustedRole': adjustedRole }),
      'adjustmentDisposition': adjustmentDisposition,
      'algo': current.algo,
      'causes': [...causes],
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
    selection: ContrastPolicy.SelectionInterface,
    provenance: ReadonlyMap<string, RoleProvenanceEntity.Type>
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
      const pair = ContrastExecution.reportEntry(roles, entry, provenance);
      if (pair !== undefined) {
        pairs.push(pair);
      }
    }
    const problemPairs = pairs.filter((pair) => {
      const result = !pair.passed;
      return result;
    });
    const result = ContrastReportEntity.create({
      'compliant': problemPairs.length === 0,
      'pairs': pairs,
      'problemPairs': problemPairs,
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
        {
          'causes': ['pin'],
          ...(maximumRatio === undefined ? {} : { 'maximumRatio': maximumRatio })
        }
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
        {
          'causes': ['solver-exhausted'],
          ...(maximumRatio === undefined ? {} : { 'maximumRatio': maximumRatio })
        }
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
    const causes = options.causes ?? [];
    const maximumRatio = options.maximumRatio;
    const result = PendingContrastEntryEntity.create({
      'adjusted': adjusted,
      ...(adjustedRole === undefined ? {} : { 'adjustedRole': adjustedRole }),
      'adjustmentDisposition': adjustmentDisposition,
      'algo': algorithm,
      'causes': [...causes],
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
    entry: PendingContrastEntryEntity.Type,
    provenance: ReadonlyMap<string, RoleProvenanceEntity.Type>
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
    const adjustedRoles = ContrastExecution.adjustedRoles(entry, provenance);
    const result = ContrastReportEntryEntity.create({
      'actual': actual,
      'adjustedRoles': adjustedRoles,
      'background': entry.pair.background,
      'causes': passed ? [] : entry.causes,
      'disposition': passed ? 'resolved' : 'best-effort',
      'foreground': entry.pair.foreground,
      'passed': passed,
      'required': entry.minimumContrastRatio,
      'shortfall': ContrastBand.shortfall(
        actual,
        entry.minimumContrastRatio,
        entry.maximumContrastRatio
      )
    });
    return result;
  }

  private static adjustedRoles(
    entry: PendingContrastEntryEntity.Type,
    provenance: ReadonlyMap<string, RoleProvenanceEntity.Type>
  ): string[] {
    const roleNames = [entry.pair.foreground, entry.pair.background];
    const result: string[] = [];
    for (let index = 0; index < roleNames.length; index += 1) {
      const roleName = roleNames[index];
      if (roleName === undefined) {
        continue;
      }
      const adjustments = provenance.get(roleName)?.adjustments ?? [];
      let adjusted = false;
      for (let adjustmentIndex = 0; adjustmentIndex < adjustments.length; adjustmentIndex += 1) {
        const adjustment = adjustments[adjustmentIndex];
        if (adjustment?.operation === 'contrast') {
          adjusted = true;
          break;
        }
      }
      if (adjusted) {
        result.push(roleName);
      }
    }
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
    const report = ContrastExecution.report(roles, pending, selection, Metadata.roleProvenance(state.metadata));
    roles.commit();
    Metadata.writeContrastReport(state.metadata, report);
  }
}

/** Singleton instance registered as the `enforce:contrast` pipeline task. */
export const enforceContrast = new EnforceContrast();
