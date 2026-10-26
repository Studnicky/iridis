import type {
  ColorHintsEntity,
  ColorRecordEntity,
  ContrastOptionsEntity,
  PaletteStateInterface,
  RelationshipConstraintDomain
} from '@studnicky/iridis';

import {
  ColorCoordinate,
  colorRecordFactory,
  CompositeKey,
  HueIntervalBounds,
  InputEntity,
  Metadata,
  PaletteRoleState,
  RelationshipConstraint,
  RoleSchemaEntity
} from '@studnicky/iridis';
import { ContrastPolicy, RoleGeometry } from '@studnicky/iridis/tasks';

import { ContrastFeasibilityProofEntity } from './entities/ContrastFeasibilityProofEntity.ts';
import { ContrastFeasibilityReportEntity } from './entities/ContrastFeasibilityReportEntity.ts';
import { ContrastPairFeasibilityEntity } from './entities/ContrastPairFeasibilityEntity.ts';
import { ContrastSampledFeasibilityEvidenceEntity } from './entities/ContrastSampledFeasibilityEvidenceEntity.ts';
import { HueRangeEntity } from './entities/HueRangeEntity.ts';

interface ColorExtremaInterface {
  readonly 'maximum': ColorCoordinate;
  readonly 'minimum': ColorCoordinate;
}

interface HueEvaluationInterface {
  readonly 'actual': number;
  readonly 'background': ColorCoordinate;
  readonly 'foreground': ColorCoordinate;
  readonly 'hue': number;
}

interface HueRelationInterface {
  readonly 'affineOffset'?: number;
  resolve(rootHue: number): number;
  readonly 'root': string;
}

interface HueArcInterface {
  readonly 'end': number;
  readonly 'start': number;
}

interface LuminanceBoundsInterface {
  readonly 'maximumApca': number;
  readonly 'maximumWcag': number;
  readonly 'minimumApca': number;
  readonly 'minimumWcag': number;
}

interface RoleDomainInterface {
  readonly 'chroma': readonly [number, number];
  readonly 'fixedRecord'?: ColorRecordEntity.Type;
  readonly 'hints'?: ColorHintsEntity.Type;
  readonly 'hue'?: number;
  readonly 'hueArcs'?: readonly HueArcInterface[];
  readonly 'lightness': readonly [number, number];
  readonly 'name': string;
  readonly 'relation'?: HueRelationInterface;
  readonly 'relationship'?: RelationshipConstraintDomain;
}

interface RoleDomainOptionsInterface {
  readonly 'chroma'?: readonly [number, number];
  readonly 'fixedRecord'?: ColorRecordEntity.Type;
  readonly 'hueArcs'?: readonly HueArcInterface[];
  readonly 'lightness'?: readonly [number, number];
  readonly 'relation'?: HueRelationInterface;
  readonly 'relationship'?: RelationshipConstraintDomain;
  readonly 'resolvedHue'?: number;
}

interface DomainsOptionsInterface {
  readonly 'input'?: PaletteStateInterface['input'];
  readonly 'metadata'?: PaletteStateInterface['metadata'];
  readonly 'provenance'?: ReadonlyMap<string, { readonly 'origin': string }>;
  readonly 'roles'?: Readonly<Record<string, ColorRecordEntity.Type>>;
}

interface CoordinateProjectionOptionsInterface {
  readonly 'maximum': number;
  readonly 'minimum': number;
  readonly 'tolerance': number | undefined;
}

interface HueProjectionInterface {
  readonly 'hueArcs'?: readonly HueArcInterface[];
  readonly 'relation'?: HueRelationInterface;
  readonly 'resolvedHue'?: number;
}

interface SearchCellInterface {
  readonly 'cMaximum': number;
  readonly 'cMinimum': number;
  readonly 'lMaximum': number;
  readonly 'lMinimum': number;
}

/**
 * Evaluates schema envelopes through the engine's emitted sRGB records and contrast primitives.
 * Hue-independent neutral envelopes receive exact all-hue certificates. Fixed hues use bounded
 * lightness/chroma extrema; unanchored hue domains retain explicitly sampled, indeterminate evidence.
 */
class ContrastFeasibilityDomain {
  static readonly #BLACK = ColorCoordinate.fromOklch(0, 0, 0);
  static readonly #CHROMA_PRECISION = 0.02;
  /** Each independent root hue domain is certified in eight conservative 45-degree cells. */
  static readonly #INDEPENDENT_HUE_DIVISIONS = 8;
  static readonly #LIGHTNESS_PRECISION = 1 / 1024;

  static #isHigher(current: number, candidate: number): boolean {
    const result = candidate > current;
    return result;
  }

  static #isLower(current: number, candidate: number): boolean {
    const result = candidate < current;
    return result;
  }

  static analyzePair(
    foreground: RoleDomainInterface,
    background: RoleDomainInterface,
    requirement: ContrastPolicy.RequirementInterface
  ): ContrastPairFeasibilityEntity.Type {
    const relationshipHue = ContrastFeasibilityDomain.relationshipHueCertificate(foreground, background, requirement);
    if (relationshipHue !== undefined) {
      return relationshipHue;
    }
    const neutral = ContrastFeasibilityDomain.neutralEvaluation(foreground, background, requirement);
    if (neutral !== undefined && neutral.actual >= requirement.minimumContrastRatio) {
      const result = ContrastFeasibilityDomain.alwaysReachable(foreground, background);
      return result;
    }
    const analyticHueArcs = ContrastFeasibilityDomain.analyticHueArcs(foreground, background, requirement);
    if (analyticHueArcs !== undefined) {
      return analyticHueArcs;
    }
    const independentHueArcs = ContrastFeasibilityDomain.independentHueArcs(foreground, background, requirement);
    if (independentHueArcs !== undefined) {
      return independentHueArcs;
    }
    const hasFixedHueDomain = ContrastFeasibilityDomain.hasFixedHueDomain(foreground, background);
    const evaluations = hasFixedHueDomain
      ? ContrastFeasibilityDomain.evaluateHues(foreground, background, requirement)
      : ContrastFeasibilityDomain.representativeEvaluations(foreground, background, requirement);
    const best = ContrastFeasibilityDomain.bestEvaluation(evaluations);
    if (!hasFixedHueDomain) {
      const result = ContrastPairFeasibilityEntity.intake({
        'background': background.name,
        'foreground': foreground.name,
        'reachability': 'indeterminate',
        'reachableHueRanges': [],
        'sampled': ContrastFeasibilityDomain.sampled(evaluations, best)
      });
      return result;
    }
    const reachesRequirement = best.actual >= requirement.minimumContrastRatio;
    const reachability = reachesRequirement ? 'always-reachable' : 'never-reachable';
    const proof = reachesRequirement
      ? undefined
      : ContrastFeasibilityDomain.proof(best, foreground, background, requirement);
    const result = ContrastPairFeasibilityEntity.intake({
      'background': background.name,
      'foreground': foreground.name,
      ...(proof === undefined ? {} : { 'proof': proof }),
      'reachability': reachability,
      'reachableHueRanges': reachesRequirement
        ? [HueRangeEntity.intake({ 'end': 360, 'start': 0 })]
        : []
    });
    return result;
  }

  private static relationshipHueCertificate(
    foreground: RoleDomainInterface,
    background: RoleDomainInterface,
    requirement: ContrastPolicy.RequirementInterface
  ): ContrastPairFeasibilityEntity.Type | undefined {
    const foregroundArcs = ContrastFeasibilityDomain.relationshipHueArcs(foreground);
    const backgroundArcs = ContrastFeasibilityDomain.relationshipHueArcs(background);
    if (foregroundArcs === undefined && backgroundArcs === undefined) {
      return undefined;
    }
    const foregroundCandidates = foregroundArcs ?? ContrastFeasibilityDomain.fixedHueArcs(foreground);
    const backgroundCandidates = backgroundArcs ?? ContrastFeasibilityDomain.fixedHueArcs(background);
    if (foregroundCandidates === undefined || backgroundCandidates === undefined) {
      return undefined;
    }
    for (let foregroundIndex = 0; foregroundIndex < foregroundCandidates.length; foregroundIndex += 1) {
      const foregroundArc = foregroundCandidates[foregroundIndex];
      if (foregroundArc === undefined) {
        continue;
      }
      for (let backgroundIndex = 0; backgroundIndex < backgroundCandidates.length; backgroundIndex += 1) {
        const backgroundArc = backgroundCandidates[backgroundIndex];
        if (backgroundArc === undefined || !ContrastFeasibilityDomain.arcsAlwaysPass(foreground, background, foregroundArc, backgroundArc, requirement)) {
          const result = ContrastFeasibilityDomain.sampledIndeterminate(foreground, background, requirement);
          return result;
        }
      }
    }
    const result = ContrastFeasibilityDomain.alwaysReachable(foreground, background);
    return result;
  }

  private static relationshipHueArcs(domain: RoleDomainInterface): readonly HueArcInterface[] | undefined {
    if (domain.hueArcs !== undefined) {
      return domain.hueArcs;
    }
    const tolerance = domain.relationship?.tolerance?.hue;
    const baseline = domain.relationship?.baseline?.oklch.h;
    if (tolerance === undefined || tolerance <= 0 || baseline === undefined) {
      return undefined;
    }
    const lower = baseline - tolerance;
    const upper = baseline + tolerance;
    if (lower < 0) {
      return [{ 'end': upper, 'start': 0 }, { 'end': 360, 'start': lower + 360 }];
    }
    if (upper > 360) {
      return [{ 'end': upper - 360, 'start': 0 }, { 'end': 360, 'start': lower }];
    }
    return [{ 'end': upper, 'start': lower }];
  }

  private static fixedHueArcs(domain: RoleDomainInterface): readonly HueArcInterface[] | undefined {
    const hue = domain.fixedRecord?.oklch.h ?? domain.hue;
    if (hue === undefined) {
      return undefined;
    }
    const result: readonly HueArcInterface[] = [{ 'end': hue, 'start': hue }];
    return result;
  }

  private static arcsAlwaysPass(
    foreground: RoleDomainInterface,
    background: RoleDomainInterface,
    foregroundArc: HueArcInterface,
    backgroundArc: HueArcInterface,
    requirement: ContrastPolicy.RequirementInterface
  ): boolean {
    const foregroundBounds = ContrastFeasibilityDomain.hueBounds(foreground, foregroundArc);
    const backgroundBounds = ContrastFeasibilityDomain.hueBounds(background, backgroundArc);
    const minimum = requirement.algorithm === 'apca'
      ? HueIntervalBounds.apcaMagnitudeBounds(
        foregroundBounds.minimumApca,
        foregroundBounds.maximumApca,
        backgroundBounds.minimumApca,
        backgroundBounds.maximumApca
      )[0]
      : ContrastFeasibilityDomain.wcagLowerBound(
        foregroundBounds.minimumWcag,
        foregroundBounds.maximumWcag,
        backgroundBounds.minimumWcag,
        backgroundBounds.maximumWcag
      );
    const result = minimum >= requirement.minimumContrastRatio;
    return result;
  }

  private static hueBounds(domain: RoleDomainInterface, arc: HueArcInterface): LuminanceBoundsInterface {
    if (domain.fixedRecord !== undefined) {
      const coordinate = ColorCoordinate.fromRecord(domain.fixedRecord);
      return {
        'maximumApca': coordinate.apcaLuminance,
        'maximumWcag': coordinate.relativeLuminance,
        'minimumApca': coordinate.apcaLuminance,
        'minimumWcag': coordinate.relativeLuminance
      };
    }
    const bounds = HueIntervalBounds.range(domain.lightness, domain.chroma, arc.start, arc.end);
    return {
      'maximumApca': bounds.maximumApcaLuminance,
      'maximumWcag': bounds.maximumRelativeLuminance,
      'minimumApca': bounds.minimumApcaLuminance,
      'minimumWcag': bounds.minimumRelativeLuminance
    };
  }

  static sampledIndeterminate(
    foreground: RoleDomainInterface,
    background: RoleDomainInterface,
    requirement: ContrastPolicy.RequirementInterface
  ): ContrastPairFeasibilityEntity.Type {
    const evaluations = ContrastFeasibilityDomain.representativeEvaluations(foreground, background, requirement);
    const best = ContrastFeasibilityDomain.bestEvaluation(evaluations);
    const result = ContrastPairFeasibilityEntity.intake({
      'background': background.name,
      'foreground': foreground.name,
      'reachability': 'indeterminate',
      'reachableHueRanges': [],
      'sampled': ContrastFeasibilityDomain.sampled(evaluations, best)
    });
    return result;
  }

  private static alwaysReachable(
    foreground: RoleDomainInterface,
    background: RoleDomainInterface
  ): ContrastPairFeasibilityEntity.Type {
    const result = ContrastPairFeasibilityEntity.intake({
      'background': background.name,
      'foreground': foreground.name,
      'reachability': 'always-reachable',
      'reachableHueRanges': [HueRangeEntity.intake({ 'end': 360, 'start': 0 })]
    });
    return result;
  }

  private static independentHueArcs(
    foreground: RoleDomainInterface,
    background: RoleDomainInterface,
    requirement: ContrastPolicy.RequirementInterface
  ): ContrastPairFeasibilityEntity.Type | undefined {
    const foregroundRoot = foreground.relation?.root ?? foreground.name;
    const backgroundRoot = background.relation?.root ?? background.name;
    if (foregroundRoot === backgroundRoot || foreground.hue !== undefined || background.hue !== undefined) {
      return undefined;
    }
    for (let foregroundIndex = 0; foregroundIndex < ContrastFeasibilityDomain.#INDEPENDENT_HUE_DIVISIONS; foregroundIndex += 1) {
      const foregroundArc = {
        'end': ((foregroundIndex + 1) * 360) / ContrastFeasibilityDomain.#INDEPENDENT_HUE_DIVISIONS,
        'start': (foregroundIndex * 360) / ContrastFeasibilityDomain.#INDEPENDENT_HUE_DIVISIONS
      };
      for (let backgroundIndex = 0; backgroundIndex < ContrastFeasibilityDomain.#INDEPENDENT_HUE_DIVISIONS; backgroundIndex += 1) {
        const backgroundArc = {
          'end': ((backgroundIndex + 1) * 360) / ContrastFeasibilityDomain.#INDEPENDENT_HUE_DIVISIONS,
          'start': (backgroundIndex * 360) / ContrastFeasibilityDomain.#INDEPENDENT_HUE_DIVISIONS
        };
        if (!ContrastFeasibilityDomain.hasWitness(foreground, background, foregroundRoot, backgroundRoot, foregroundArc, backgroundArc, requirement)) {
          return undefined;
        }
      }
    }
    const result = ContrastFeasibilityDomain.alwaysReachable(foreground, background);
    return result;
  }

  private static hasWitness(
    foreground: RoleDomainInterface, background: RoleDomainInterface, foregroundRoot: string, backgroundRoot: string,
    foregroundArc: HueArcInterface, backgroundArc: HueArcInterface, requirement: ContrastPolicy.RequirementInterface
  ): boolean {
    const foregroundHue = ContrastFeasibilityDomain.domainHueArc(foreground, foregroundRoot, foregroundArc);
    const backgroundHue = ContrastFeasibilityDomain.domainHueArc(background, backgroundRoot, backgroundArc);
    if (
      foregroundHue === undefined ||
      backgroundHue === undefined ||
      foregroundHue.start < 0 || foregroundHue.end > 360 ||
      backgroundHue.start < 0 || backgroundHue.end > 360
    ) {
      return false;
    }
    const foregroundCandidates = ContrastFeasibilityDomain.candidates(foreground);
    const backgroundCandidates = ContrastFeasibilityDomain.candidates(background);
    for (let foregroundIndex = 0; foregroundIndex < foregroundCandidates.length; foregroundIndex += 1) {
      const foregroundCandidate = foregroundCandidates[foregroundIndex];
      if (foregroundCandidate === undefined) { continue; }
      for (let backgroundIndex = 0; backgroundIndex < backgroundCandidates.length; backgroundIndex += 1) {
        const backgroundCandidate = backgroundCandidates[backgroundIndex];
        if (backgroundCandidate === undefined) { continue; }
        if (ContrastFeasibilityDomain.witnessPasses(foregroundCandidate, backgroundCandidate, foregroundHue, backgroundHue, requirement)) {
          return true;
        }
      }
    }
    return false;
  }

  private static candidates(domain: RoleDomainInterface): readonly (readonly [number, number])[] {
    const result = [
      [domain.lightness[0], domain.chroma[0]], [domain.lightness[0], domain.chroma[1]],
      [domain.lightness[1], domain.chroma[0]], [domain.lightness[1], domain.chroma[1]]
    ] as const;
    return result;
  }

  private static witnessPasses(
    foreground: readonly [number, number], background: readonly [number, number], foregroundHue: HueArcInterface, backgroundHue: HueArcInterface, requirement: ContrastPolicy.RequirementInterface
  ): boolean {
    const foregroundBounds = HueIntervalBounds.fixedArc(foreground[0], foreground[1], foregroundHue.start, foregroundHue.end);
    const backgroundBounds = HueIntervalBounds.fixedArc(background[0], background[1], backgroundHue.start, backgroundHue.end);
    const wcagLower = ContrastFeasibilityDomain.wcagLowerBound(
      foregroundBounds.minimumRelativeLuminance,
      foregroundBounds.maximumRelativeLuminance,
      backgroundBounds.minimumRelativeLuminance,
      backgroundBounds.maximumRelativeLuminance
    );
    const lower = requirement.algorithm === 'apca'
      ? HueIntervalBounds.apcaMagnitudeBounds(foregroundBounds.minimumApcaLuminance, foregroundBounds.maximumApcaLuminance, backgroundBounds.minimumApcaLuminance, backgroundBounds.maximumApcaLuminance)[0]
      : wcagLower;
    const result = lower >= requirement.minimumContrastRatio;
    return result;
  }

  private static wcagLowerBound(
    foregroundMinimum: number,
    foregroundMaximum: number,
    backgroundMinimum: number,
    backgroundMaximum: number
  ): number {
    if (foregroundMinimum > backgroundMaximum) {
      const result = (foregroundMinimum + 0.05) / (backgroundMaximum + 0.05);
      return result;
    }
    if (backgroundMinimum > foregroundMaximum) {
      const result = (backgroundMinimum + 0.05) / (foregroundMaximum + 0.05);
      return result;
    }
    return 1;
  }

  private static analyticHueArcs(
    foreground: RoleDomainInterface,
    background: RoleDomainInterface,
    requirement: ContrastPolicy.RequirementInterface
  ): ContrastPairFeasibilityEntity.Type | undefined {
    const root = ContrastFeasibilityDomain.sharedHueRoot(foreground, background);
    if (root === undefined) {
      return undefined;
    }
    const arcs = ContrastFeasibilityDomain.hueArcs(foreground, background, root);
    const passing: HueArcInterface[] = [];
    let indeterminate = false;
    for (let index = 0; index < arcs.length; index += 1) {
      const arc = arcs[index];
      if (arc === undefined) {
        continue;
      }
      const bounds = ContrastFeasibilityDomain.arcContrastBounds(foreground, background, root, arc, requirement);
      if (bounds === undefined) {
        indeterminate = true;
        continue;
      }
      const [minimum, maximum] = bounds;
      if (minimum >= requirement.minimumContrastRatio) {
        passing.push(arc);
        continue;
      }
      if (maximum >= requirement.minimumContrastRatio) {
        indeterminate = true;
      }
    }
    const evaluations = ContrastFeasibilityDomain.representativeEvaluations(foreground, background, requirement);
    const best = ContrastFeasibilityDomain.bestEvaluation(evaluations);
    if (passing.length === arcs.length) {
      const result = ContrastFeasibilityDomain.alwaysReachable(foreground, background);
      return result;
    }
    if (passing.length > 0 && !indeterminate) {
      const ranges = passing.map((arc): HueRangeEntity.Type => {
        const result = HueRangeEntity.intake({ 'end': arc.end, 'start': arc.start });
        return result;
      });
      const result = ContrastPairFeasibilityEntity.intake({
        'background': background.name,
        'foreground': foreground.name,
        'reachability': 'reachable-only-for-some-hues',
        'reachableHueRanges': ranges
      });
      return result;
    }
    const result = ContrastPairFeasibilityEntity.intake({
      'background': background.name,
      'foreground': foreground.name,
      'reachability': 'indeterminate',
      'reachableHueRanges': [],
      'sampled': ContrastFeasibilityDomain.sampled(evaluations, best)
    });
    return result;
  }

  private static arcContrastBounds(
    foreground: RoleDomainInterface,
    background: RoleDomainInterface,
    root: string,
    arc: HueArcInterface,
    requirement: ContrastPolicy.RequirementInterface
  ): readonly [number, number] | undefined {
    const foregroundBounds = ContrastFeasibilityDomain.arcLuminanceBounds(foreground, root, arc);
    const backgroundBounds = ContrastFeasibilityDomain.arcLuminanceBounds(background, root, arc);
    if (foregroundBounds === undefined || backgroundBounds === undefined) {
      return undefined;
    }
    if (requirement.algorithm === 'apca') {
      const result = HueIntervalBounds.apcaMagnitudeBounds(
        foregroundBounds.minimumApca,
        foregroundBounds.maximumApca,
        backgroundBounds.minimumApca,
        backgroundBounds.maximumApca
      );
      return result;
    }
    const minimum = ContrastFeasibilityDomain.wcagLowerBound(
      foregroundBounds.minimumWcag,
      foregroundBounds.maximumWcag,
      backgroundBounds.minimumWcag,
      backgroundBounds.maximumWcag
    );
    const maximum = Math.max(
      (foregroundBounds.maximumWcag + 0.05) / (backgroundBounds.minimumWcag + 0.05),
      (backgroundBounds.maximumWcag + 0.05) / (foregroundBounds.minimumWcag + 0.05)
    );
    const result: readonly [number, number] = [minimum, maximum];
    return result;
  }

  private static arcLuminanceBounds(
    domain: RoleDomainInterface,
    root: string,
    arc: HueArcInterface
  ): LuminanceBoundsInterface | undefined {
    if (domain.fixedRecord !== undefined) {
      const coordinate = ColorCoordinate.fromRecord(domain.fixedRecord);
      return {
        'maximumApca': coordinate.apcaLuminance,
        'maximumWcag': coordinate.relativeLuminance,
        'minimumApca': coordinate.apcaLuminance,
        'minimumWcag': coordinate.relativeLuminance
      };
    }
    const hue = ContrastFeasibilityDomain.domainHueArc(domain, root, arc);
    if (hue === undefined) {
      return undefined;
    }
    const bounds = HueIntervalBounds.range(domain.lightness, domain.chroma, hue.start, hue.end);
    return {
      'maximumApca': bounds.maximumApcaLuminance,
      'maximumWcag': bounds.maximumRelativeLuminance,
      'minimumApca': bounds.minimumApcaLuminance,
      'minimumWcag': bounds.minimumRelativeLuminance
    };
  }

  private static domainHueArc(
    domain: RoleDomainInterface,
    root: string,
    arc: HueArcInterface
  ): HueArcInterface | undefined {
    if (domain.hue !== undefined) {
      const result = { 'end': domain.hue, 'start': domain.hue };
      return result;
    }
    const relation = domain.relation;
    if (relation?.root === root && relation.affineOffset === undefined) {
      const start = relation.resolve(arc.start);
      const end = relation.resolve(arc.end);
      return { 'end': Math.max(start, end), 'start': Math.min(start, end) };
    }
    const offset = ContrastFeasibilityDomain.domainAffineOffset(domain, root);
    if (offset === undefined) {
      return undefined;
    }
    const start = ContrastFeasibilityDomain.shiftHueAtArcStart(arc.start, offset);
    const end = ContrastFeasibilityDomain.shiftHueAtArcEnd(arc.end, offset);
    if (start > end) {
      return undefined;
    }
    const result = { 'end': end, 'start': start };
    return result;
  }

  private static domainAffineOffset(domain: RoleDomainInterface, root: string): number | undefined {
    if (domain.relation?.root === root && domain.relation.affineOffset !== undefined) {
      return domain.relation.affineOffset;
    }
    if (domain.relation === undefined && domain.name === root && domain.hue === undefined) {
      return 0;
    }
    return undefined;
  }

  private static hueArcs(
    foreground: RoleDomainInterface,
    background: RoleDomainInterface,
    root: string
  ): readonly HueArcInterface[] {
    const offsets = [
      ContrastFeasibilityDomain.domainAffineOffset(foreground, root),
      ContrastFeasibilityDomain.domainAffineOffset(background, root)
    ];
    const boundaries = new Set<number>([0, 360]);
    for (let index = 0; index < offsets.length; index += 1) {
      const offset = offsets[index];
      if (offset === undefined || offset === 0) {
        continue;
      }
      boundaries.add(360 - offset);
    }
    const sorted = [...boundaries].sort((left, right): number => {
      const result = left - right;
      return result;
    });
    const result: HueArcInterface[] = [];
    for (let index = 1; index < sorted.length; index += 1) {
      const start = sorted[index - 1];
      const end = sorted[index];
      if (start !== undefined && end !== undefined) {
        result.push({ 'end': end, 'start': start });
      }
    }
    return result;
  }

  private static sharedHueRoot(
    foreground: RoleDomainInterface,
    background: RoleDomainInterface
  ): string | undefined {
    const foregroundRoot = foreground.relation?.root;
    const backgroundRoot = background.relation?.root;
    if (foregroundRoot !== undefined && backgroundRoot !== undefined && foregroundRoot !== backgroundRoot) {
      return undefined;
    }
    const root = foregroundRoot ?? backgroundRoot;
    if (root === undefined) {
      return undefined;
    }
    const foregroundOffset = ContrastFeasibilityDomain.domainAffineOffset(foreground, root);
    const backgroundOffset = ContrastFeasibilityDomain.domainAffineOffset(background, root);
    const foregroundKnown = foreground.hue !== undefined || foreground.fixedRecord !== undefined || foregroundOffset !== undefined;
    const backgroundKnown = background.hue !== undefined || background.fixedRecord !== undefined || backgroundOffset !== undefined;
    const result = foregroundKnown && backgroundKnown ? root : undefined;
    return result;
  }

  private static shiftHueAtArcEnd(value: number, offset: number): number {
    const shifted = value + offset;
    const result = shifted > 360 ? shifted - 360 : shifted;
    return result;
  }

  private static shiftHueAtArcStart(value: number, offset: number): number {
    const shifted = value + offset;
    const result = shifted >= 360 ? shifted - 360 : shifted;
    return result;
  }

  static domain(
    role: RoleSchemaEntity.Type['roles'][number],
    options?: RoleDomainOptionsInterface
  ): RoleDomainInterface {
    const relationship = options?.relationship;
    const baseline = relationship?.baseline;
    const tolerance = relationship?.tolerance;
    const lightness = options?.lightness ?? (baseline === undefined || tolerance === undefined
      ? role.lightnessRange ?? [0, 1]
      : ContrastFeasibilityDomain.intersection(role.lightnessRange ?? [0, 1], baseline.oklch.l, tolerance.lightness));
    const chroma = options?.chroma ?? (baseline === undefined || tolerance === undefined
      ? role.chromaRange ?? [0, 0.5]
      : ContrastFeasibilityDomain.intersection(role.chromaRange ?? [0, 0.5], baseline.oklch.c, tolerance.chroma));
    const fixedRecord = options?.fixedRecord ?? (relationship?.tolerance === undefined ? baseline : undefined);
    const hue = baseline?.oklch.h ?? options?.resolvedHue;
    const result: RoleDomainInterface = {
      'chroma': chroma,
      ...(fixedRecord === undefined ? {} : { 'fixedRecord': fixedRecord }),
      ...(hue === undefined ? {} : { 'hue': hue }),
      ...(options?.hueArcs === undefined ? {} : { 'hueArcs': options.hueArcs }),
      ...(role.intent === undefined ? {} : { 'hints': { 'intent': role.intent } }),
      'lightness': lightness,
      'name': role.name,
      ...(options?.relation === undefined ? {} : { 'relation': options.relation }),
      ...(relationship === undefined ? {} : { 'relationship': relationship })
    };
    return result;
  }

  private static intersection(
    authored: readonly [number, number],
    baseline: number,
    tolerance: number | undefined
  ): readonly [number, number] {
    const lower = Math.max(authored[0], baseline - (tolerance ?? 0));
    const upper = Math.min(authored[1], baseline + (tolerance ?? 0));
    const result: readonly [number, number] = lower <= upper ? [lower, upper] : [lower, lower];
    return result;
  }
  static record(
    domain: RoleDomainInterface,
    lightness: number,
    chroma: number,
    hue: number
  ): ColorRecordEntity.Type {
    const result = colorRecordFactory.fromOklch(lightness, chroma, domain.hue ?? hue, {
      ...(domain.hints === undefined ? {} : { 'hints': domain.hints })
    });
    return result;
  }

  static coordinate(
    domain: RoleDomainInterface,
    lightness: number,
    chroma: number,
    hue: number
  ): ColorCoordinate {
    const result = ColorCoordinate.fromOklch(lightness, chroma, domain.hue ?? hue);
    return result;
  }

  private static hasFixedHueDomain(
    foreground: RoleDomainInterface,
    background: RoleDomainInterface
  ): boolean {
    const result =
      (foreground.fixedRecord !== undefined || foreground.hue !== undefined) &&
      (background.fixedRecord !== undefined || background.hue !== undefined);
    return result;
  }
  private static bestSample(
    candidates: readonly ColorCoordinate[],
    requirement: ContrastPolicy.RequirementInterface,
    isImprovement: (current: number, candidate: number) => boolean
  ): ColorCoordinate {
    const first = candidates[0];
    if (first === undefined) {
      throw new TypeError('Contrast feasibility sample set is empty');
    }
    let result = first;
    let selectedMeasure = ContrastFeasibilityDomain.luminance(result, requirement);
    for (let index = 1; index < candidates.length; index += 1) {
      const candidate = candidates[index];
      if (candidate === undefined) {
        continue;
      }
      const measure = ContrastFeasibilityDomain.luminance(candidate, requirement);
      if (isImprovement(selectedMeasure, measure)) {
        result = candidate;
        selectedMeasure = measure;
      }
    }
    return result;
  }

  private static bestEvaluation(
    evaluations: readonly HueEvaluationInterface[]
  ): HueEvaluationInterface {
    const first = evaluations[0];
    if (first === undefined) {
      throw new TypeError('Contrast feasibility requires at least one hue evaluation');
    }
    let result = first;
    for (let index = 1; index < evaluations.length; index += 1) {
      const candidate = evaluations[index];
      if (candidate !== undefined && candidate.actual > result.actual) {
        result = candidate;
      }
    }
    return result;
  }

  private static neutralEvaluation(
    foreground: RoleDomainInterface,
    background: RoleDomainInterface,
    requirement: ContrastPolicy.RequirementInterface
  ): HueEvaluationInterface | undefined {
    if (
      foreground.fixedRecord !== undefined ||
      background.fixedRecord !== undefined ||
      foreground.chroma[0] > 0 ||
      background.chroma[0] > 0
    ) {
      return undefined;
    }
    const foregroundCoordinates = foreground.lightness.map((lightness): ColorCoordinate => {
      const result = ColorCoordinate.fromOklch(lightness, 0, 0);
      return result;
    });
    const backgroundCoordinates = background.lightness.map((lightness): ColorCoordinate => {
      const result = ColorCoordinate.fromOklch(lightness, 0, 0);
      return result;
    });
    let actual = -Infinity;
    let selectedForeground = foregroundCoordinates[0];
    let selectedBackground = backgroundCoordinates[0];
    if (selectedForeground === undefined || selectedBackground === undefined) {
      throw new TypeError('Contrast feasibility neutral extrema are empty');
    }
    for (let foregroundIndex = 0; foregroundIndex < foregroundCoordinates.length; foregroundIndex += 1) {
      const foregroundCoordinate = foregroundCoordinates[foregroundIndex];
      if (foregroundCoordinate === undefined) {
        continue;
      }
      for (let backgroundIndex = 0; backgroundIndex < backgroundCoordinates.length; backgroundIndex += 1) {
        const backgroundCoordinate = backgroundCoordinates[backgroundIndex];
        if (backgroundCoordinate === undefined) {
          continue;
        }
        const candidate = ContrastFeasibilityDomain.measure(foregroundCoordinate, backgroundCoordinate, requirement);
        if (candidate > actual) {
          actual = candidate;
          selectedForeground = foregroundCoordinate;
          selectedBackground = backgroundCoordinate;
        }
      }
    }
    return {
      'actual': actual,
      'background': selectedBackground,
      'foreground': selectedForeground,
      'hue': 0
    };
  }

  private static evaluateHue(
    foreground: RoleDomainInterface,
    background: RoleDomainInterface,
    foregroundHue: number,
    backgroundHue: number,
    sourceHue: number,
    requirement: ContrastPolicy.RequirementInterface
  ): HueEvaluationInterface {
    const foregroundExtrema = ContrastFeasibilityDomain.extrema(foreground, foregroundHue, requirement);
    const backgroundExtrema = ContrastFeasibilityDomain.extrema(background, backgroundHue, requirement);
    const foregroundCoordinates = [foregroundExtrema.minimum, foregroundExtrema.maximum];
    const backgroundCoordinates = [backgroundExtrema.minimum, backgroundExtrema.maximum];
    let actual = -Infinity;
    let selectedForeground = foregroundCoordinates[0];
    let selectedBackground = backgroundCoordinates[0];
    if (selectedForeground === undefined || selectedBackground === undefined) {
      throw new TypeError('Contrast feasibility extrema are empty');
    }
    for (let foregroundIndex = 0; foregroundIndex < foregroundCoordinates.length; foregroundIndex += 1) {
      const foregroundCoordinate = foregroundCoordinates[foregroundIndex];
      if (foregroundCoordinate === undefined) {
        continue;
      }
      for (let backgroundIndex = 0; backgroundIndex < backgroundCoordinates.length; backgroundIndex += 1) {
        const backgroundCoordinate = backgroundCoordinates[backgroundIndex];
        if (backgroundCoordinate === undefined) {
          continue;
        }
        const candidate = ContrastFeasibilityDomain.measure(foregroundCoordinate, backgroundCoordinate, requirement);
        if (candidate > actual) {
          actual = candidate;
          selectedForeground = foregroundCoordinate;
          selectedBackground = backgroundCoordinate;
        }
      }
    }
    return {
      'actual': actual,
      'background': selectedBackground,
      'foreground': selectedForeground,
      'hue': sourceHue
    };
  }


  private static representativeEvaluations(
    foreground: RoleDomainInterface,
    background: RoleDomainInterface,
    requirement: ContrastPolicy.RequirementInterface
  ): readonly HueEvaluationInterface[] {
    const hues = [0, 120, 240, 360] as const;
    const result = hues.map((sourceHue): HueEvaluationInterface => {
      const foregroundHue = foreground.relation?.resolve(sourceHue) ?? sourceHue;
      const backgroundHue = background.relation?.resolve(sourceHue) ?? sourceHue;
      const evaluation = ContrastFeasibilityDomain.evaluateHue(
        foreground,
        background,
        foregroundHue,
        backgroundHue,
        sourceHue,
        requirement
      );
      return evaluation;
    });
    return result;
  }

  private static extrema(
    domain: RoleDomainInterface,
    hue: number,
    requirement: ContrastPolicy.RequirementInterface
  ): ColorExtremaInterface {
    if (domain.fixedRecord !== undefined) {
      const coordinate = ColorCoordinate.fromRecord(domain.fixedRecord);
      return { 'maximum': coordinate, 'minimum': coordinate };
    }
    const initial: SearchCellInterface = {
      'cMaximum': domain.chroma[1],
      'cMinimum': domain.chroma[0],
      'lMaximum': domain.lightness[1],
      'lMinimum': domain.lightness[0]
    };
    const result: ColorExtremaInterface = {
      'maximum': ContrastFeasibilityDomain.refineExtremum(domain, hue, requirement, initial, ContrastFeasibilityDomain.#isHigher),
      'minimum': ContrastFeasibilityDomain.refineExtremum(domain, hue, requirement, initial, ContrastFeasibilityDomain.#isLower)
    };
    return result;
  }

  private static limitingBounds(
    domain: RoleDomainInterface,
    coordinate: ColorCoordinate
  ): readonly ContrastFeasibilityProofEntity.Type['limitingBounds'][number][] {
    if (domain.fixedRecord !== undefined) {
      return [{
        'channel': domain.relationship === undefined ? 'pin' : 'hue-relationship',
        'edge': 'fixed',
        'role': domain.name,
        'value': coordinate.l
      }];
    }
    const result: ContrastFeasibilityProofEntity.Type['limitingBounds'] = [];
    const lightnessEdge = ContrastFeasibilityDomain.edge(domain.lightness, coordinate.l);
    if (lightnessEdge !== undefined) {
      result.push({
        'channel': 'lightness',
        'edge': lightnessEdge,
        'role': domain.name,
        'value': coordinate.l
      });
    }
    const chromaEdge = ContrastFeasibilityDomain.edge(domain.chroma, coordinate.c);
    if (chromaEdge !== undefined) {
      result.push({
        'channel': 'chroma',
        'edge': chromaEdge,
        'role': domain.name,
        'value': coordinate.c
      });
    }
    if (coordinate.requiresDisplayP3()) {
      result.push({
        'channel': 'gamut',
        'edge': 'fixed',
        'role': domain.name,
        'value': coordinate.c
      });
    }
    return result;
  }

  private static edge(
    range: readonly [number, number],
    value: number
  ): 'minimum' | 'maximum' | undefined {
    if (Math.abs(value - range[0]) <= ContrastFeasibilityDomain.#LIGHTNESS_PRECISION) {
      return 'minimum';
    }
    if (Math.abs(value - range[1]) <= ContrastFeasibilityDomain.#LIGHTNESS_PRECISION) {
      return 'maximum';
    }
    return undefined;
  }

  private static measure(
    foreground: ColorCoordinate,
    background: ColorCoordinate,
    requirement: ContrastPolicy.RequirementInterface
  ): number {
    const result = requirement.algorithm === 'apca'
      ? Math.abs(foreground.apca(background))
      : foreground.wcag21(background);
    return result;
  }

  private static midpoint(cell: SearchCellInterface): readonly [number, number] {
    const result: readonly [number, number] = [(cell.lMinimum + cell.lMaximum) / 2, (cell.cMinimum + cell.cMaximum) / 2];
    return result;
  }

  private static proof(
    best: HueEvaluationInterface,
    foreground: RoleDomainInterface,
    background: RoleDomainInterface,
    requirement: ContrastPolicy.RequirementInterface
  ): ContrastFeasibilityProofEntity.Type {
    const shortfall = Math.max(0, requirement.minimumContrastRatio - best.actual);
    const result = ContrastFeasibilityProofEntity.intake({
      'bestActual': best.actual,
      'limitingBounds': [
        ...ContrastFeasibilityDomain.limitingBounds(foreground, best.foreground),
        ...ContrastFeasibilityDomain.limitingBounds(background, best.background)
      ],
      'missingLuminance': shortfall,
      'required': requirement.minimumContrastRatio,
      'shortfall': shortfall
    });
    return result;
  }

  private static sampled(
    evaluations: readonly HueEvaluationInterface[],
    best: HueEvaluationInterface
  ): ContrastSampledFeasibilityEvidenceEntity.Type {
    const testedHues = evaluations.map((evaluation): number => { return evaluation.hue; });
    const result = ContrastSampledFeasibilityEvidenceEntity.intake({
      'bestActual': best.actual,
      'testedHues': testedHues
    });
    return result;
  }

  private static refineExtremum(
    domain: RoleDomainInterface,
    hue: number,
    requirement: ContrastPolicy.RequirementInterface,
    cell: SearchCellInterface,
    isImprovement: (current: number, candidate: number) => boolean
  ): ColorCoordinate {
    const selected = ContrastFeasibilityDomain.bestSample(
      ContrastFeasibilityDomain.samples(domain, hue, cell),
      requirement,
      isImprovement
    );
    const [lMidpoint, cMidpoint] = ContrastFeasibilityDomain.midpoint(cell);
    const lightnessSpan = cell.lMaximum - cell.lMinimum;
    const chromaSpan = cell.cMaximum - cell.cMinimum;
    if (
      lightnessSpan <= ContrastFeasibilityDomain.#LIGHTNESS_PRECISION &&
      chromaSpan <= ContrastFeasibilityDomain.#CHROMA_PRECISION
    ) {
      return selected;
    }
    const lLower = selected.l <= lMidpoint ? cell.lMinimum : lMidpoint;
    const lUpper = selected.l <= lMidpoint ? lMidpoint : cell.lMaximum;
    const cLower = selected.c <= cMidpoint ? cell.cMinimum : cMidpoint;
    const cUpper = selected.c <= cMidpoint ? cMidpoint : cell.cMaximum;
    const next: SearchCellInterface = {
      'cMaximum': chromaSpan <= ContrastFeasibilityDomain.#CHROMA_PRECISION ? cell.cMaximum : cUpper,
      'cMinimum': chromaSpan <= ContrastFeasibilityDomain.#CHROMA_PRECISION ? cell.cMinimum : cLower,
      'lMaximum': lightnessSpan <= ContrastFeasibilityDomain.#LIGHTNESS_PRECISION ? cell.lMaximum : lUpper,
      'lMinimum': lightnessSpan <= ContrastFeasibilityDomain.#LIGHTNESS_PRECISION ? cell.lMinimum : lLower
    };
    const result = ContrastFeasibilityDomain.refineExtremum(domain, hue, requirement, next, isImprovement);
    return result;
  }

  private static samples(
    domain: RoleDomainInterface,
    hue: number,
    cell: SearchCellInterface
  ): readonly ColorCoordinate[] {
    const [lMidpoint, cMidpoint] = ContrastFeasibilityDomain.midpoint(cell);
    const lightness = [cell.lMinimum, lMidpoint, cell.lMaximum];
    const chroma = [cell.cMinimum, cMidpoint, cell.cMaximum];
    const result: ColorCoordinate[] = [];
    for (let lIndex = 0; lIndex < lightness.length; lIndex += 1) {
      const l = lightness[lIndex];
      if (l === undefined) {
        continue;
      }
      for (let cIndex = 0; cIndex < chroma.length; cIndex += 1) {
        const c = chroma[cIndex];
        if (c !== undefined) {
          result.push(ContrastFeasibilityDomain.coordinate(domain, l, c, hue));
        }
      }
    }
    return result;
  }

  private static luminance(
    coordinate: ColorCoordinate,
    requirement: ContrastPolicy.RequirementInterface
  ): number {
    const result = requirement.algorithm === 'apca'
      ? Math.abs(coordinate.apca(ContrastFeasibilityDomain.#BLACK))
      : coordinate.wcag21(ContrastFeasibilityDomain.#BLACK);
    return result;
  }

  private static evaluateHues(
    foreground: RoleDomainInterface,
    background: RoleDomainInterface,
    requirement: ContrastPolicy.RequirementInterface
  ): readonly HueEvaluationInterface[] {
    const result = [ContrastFeasibilityDomain.evaluateHue(foreground, background, 0, 0, 0, requirement)];
    return result;
  }
}

/** Numerically analyzes declared schema pairs and resolved-run constraints. */
export class ContrastFeasibility {
  static analyzeSchema(
    schema: RoleSchemaEntity.Type,
    options: ContrastOptionsEntity.Type
  ): ContrastFeasibilityReportEntity.Type {
    const input = InputEntity.intake({ 'colors': [], 'contrast': options, 'roles': schema });
    const domains = ContrastFeasibility.domains(schema, { 'input': input, 'metadata': {} });
    const roles = ContrastFeasibility.midpointRoles(domains);
    const result = ContrastFeasibility.report(domains, input, roles);
    return result;
  }

  static proveRun(
    state: PaletteStateInterface,
    pairKeys?: ReadonlySet<string>
  ): ContrastFeasibilityReportEntity.Type {
    const schema = state.input.roles;
    if (schema === undefined) {
      const result = ContrastFeasibilityReportEntity.create({ 'pairs': [] });
      return result;
    }
    const provenance = Metadata.roleProvenance(state.metadata);
    const domains = ContrastFeasibility.domains(RoleSchemaEntity.intake(schema), {
      'input': state.input,
      'metadata': state.metadata,
      'provenance': provenance,
      'roles': state.roles
    });
    const result = ContrastFeasibility.report(domains, state.input, state.roles, pairKeys);
    return result;
  }

  private static domains(
    schema: RoleSchemaEntity.Type,
    options?: DomainsOptionsInterface
  ): ReadonlyMap<string, RoleDomainInterface> {
    const roles = ContrastFeasibility.roleIndex(schema);
    const resolving = new Set<string>();
    const result = new Map<string, RoleDomainInterface>();
    const resolve = (role: RoleSchemaEntity.Type['roles'][number]): RoleDomainInterface => {
      const existing = result.get(role.name);
      if (existing !== undefined) {
        return existing;
      }
      if (resolving.has(role.name)) {
        throw new TypeError(`Relationship domain cycle includes "${role.name}"`);
      }
      resolving.add(role.name);
      const domainOptions = ContrastFeasibility.domainOptions(role, options);
      const relationship = domainOptions.relationship;
      let source: RoleDomainInterface | undefined;
      if (relationship !== undefined && relationship.baseline === undefined) {
        source = ContrastFeasibility.relationshipSource(relationship, roles, resolve);
      }
      const projected = relationship === undefined
        ? undefined
        : ContrastFeasibility.projectedOptions(role, relationship, source);
      const effectiveOptions: RoleDomainOptionsInterface = { ...domainOptions, ...projected };
      const domain = ContrastFeasibilityDomain.domain(role, effectiveOptions);
      resolving.delete(role.name);
      result.set(role.name, domain);
      return domain;
    };
    for (let index = 0; index < schema.roles.length; index += 1) {
      const role = schema.roles[index];
      if (role !== undefined) {
        resolve(role);
      }
    }
    return result;
  }

  private static domainOptions(
    role: RoleSchemaEntity.Type['roles'][number],
    options: DomainsOptionsInterface | undefined
  ): RoleDomainOptionsInterface {
    const resolved = options?.roles?.[role.name];
    const fixed = options?.provenance?.get(role.name)?.origin === 'stated' ? resolved : undefined;
    const resolvedHue = resolved?.oklch.h;
    const relationship = fixed === undefined && options?.input?.roles?.relationshipGraph !== undefined && options.metadata !== undefined
      ? RelationshipConstraint.domain(options.input, options.metadata, role.name)
      : undefined;
    const result: RoleDomainOptionsInterface = {
      ...(fixed === undefined ? {} : { 'fixedRecord': fixed }),
      ...(relationship === undefined ? {} : { 'relationship': relationship }),
      ...(resolvedHue === undefined ? {} : { 'resolvedHue': resolvedHue })
    };
    return result;
  }

  private static relationshipSource(
    relationship: RelationshipConstraintDomain,
    roles: ReadonlyMap<string, RoleSchemaEntity.Type['roles'][number]>,
    resolve: (role: RoleSchemaEntity.Type['roles'][number]) => RoleDomainInterface
  ): RoleDomainInterface | undefined {
    if (relationship.operation === 'alpha-overlay' || relationship.operation === 'oklch-interpolate') {
      return undefined;
    }
    const sourceName = relationship.sources[0];
    const source = sourceName === undefined ? undefined : roles.get(sourceName);
    if (source === undefined) {
      return undefined;
    }
    const result = resolve(source);
    return result;
  }

  private static projectedOptions(
    role: RoleSchemaEntity.Type['roles'][number],
    relationship: RelationshipConstraintDomain,
    source: RoleDomainInterface | undefined
  ): RoleDomainOptionsInterface | undefined {
    if (relationship.operation === 'alpha-overlay' || relationship.operation === 'oklch-interpolate') {
      return undefined;
    }
    const definition = relationship.relationship;
    if (source === undefined) {
      const result = ContrastFeasibility.sourceLessOptions(role.name, definition);
      return result;
    }
    const delta = definition.operation === 'oklch-delta' ? definition : undefined;
    const lightnessOffset = delta?.lightnessOffset ?? 0;
    const chromaScale = delta?.chromaScale ?? 1;
    const hueOffset = ContrastFeasibility.hueOffset(relationship, delta);
    const tolerance = relationship.tolerance;
    const lightnessProjector = delta?.lightnessOffset === undefined
      ? ContrastFeasibility.preservedCoordinateRange
      : ContrastFeasibility.projectedCoordinateRange;
    const chromaProjector = delta?.chromaScale === undefined
      ? ContrastFeasibility.preservedCoordinateRange
      : ContrastFeasibility.projectedCoordinateRange;
    const lightness = lightnessProjector(
      role.lightnessRange,
      [source.lightness[0] + lightnessOffset, source.lightness[1] + lightnessOffset],
      { 'maximum': 1, 'minimum': 0, 'tolerance': tolerance?.lightness }
    );
    const chroma = chromaProjector(
      role.chromaRange,
      [source.chroma[0] * chromaScale, source.chroma[1] * chromaScale],
      { 'maximum': 0.5, 'minimum': 0, 'tolerance': tolerance?.chroma }
    );
    const hue = ContrastFeasibility.projectedHue(source, relationship, hueOffset);
    const result: RoleDomainOptionsInterface = {
      'chroma': chroma,
      ...(hue.hueArcs === undefined ? {} : { 'hueArcs': hue.hueArcs }),
      'lightness': lightness,
      ...(hue.relation === undefined ? {} : { 'relation': hue.relation }),
      ...(hue.resolvedHue === undefined ? {} : { 'resolvedHue': hue.resolvedHue })
    };
    return result;
  }

  private static hueOffset(
    relationship: RelationshipConstraintDomain,
    delta: Extract<RelationshipConstraintDomain['relationship'], { readonly 'operation': 'oklch-delta' }> | undefined
  ): number {
    if (relationship.operation === 'hue-offset') {
      const result = relationship.hueDegrees ?? 0;
      return result;
    }
    if (delta !== undefined) {
      const result = delta.hueOffset ?? 0;
      return result;
    }
    return 0;
  }

  private static projectedHue(
    source: RoleDomainInterface,
    relationship: RelationshipConstraintDomain,
    hueOffset: number
  ): HueProjectionInterface {
    const definition = relationship.relationship;
    if (definition.operation === 'hue-target') {
      const result = ContrastFeasibility.targetHue(source, definition.hue, definition.clamp ?? RoleGeometry.DEFAULT_HUE_CLAMP);
      return result;
    }
    const sourceHue = source.fixedRecord?.oklch.h ?? source.hue;
    if (sourceHue === undefined) {
      const relation = ContrastFeasibility.offsetRelation(source, hueOffset);
      return { 'relation': relation };
    }
    const resolvedHue = ContrastFeasibility.normalizeHue(sourceHue + hueOffset);
    const tolerance = relationship.tolerance?.hue;
    if (tolerance === undefined || tolerance <= 0) {
      const result = { 'resolvedHue': resolvedHue };
      return result;
    }
    const hueArcs = ContrastFeasibility.hueArcsFor(resolvedHue, tolerance);
    return { 'hueArcs': hueArcs, 'resolvedHue': resolvedHue };
  }

  private static targetHue(
    source: RoleDomainInterface,
    hue: number,
    clamp: number
  ): HueProjectionInterface {
    const sourceHue = source.fixedRecord?.oklch.h ?? source.hue;
    if (sourceHue !== undefined) {
      const resolvedHue = RoleGeometry.hueTowards(sourceHue, hue, clamp);
      return { 'resolvedHue': resolvedHue };
    }
    const hueArcs = ContrastFeasibility.hueArcsFor(hue, 180 - clamp);
    const relation = ContrastFeasibility.targetRelation(source, hue, clamp);
    return { 'hueArcs': hueArcs, 'relation': relation };
  }

  private static preservedCoordinateRange(
    authored: readonly [number, number] | undefined,
    source: readonly [number, number],
    options: CoordinateProjectionOptionsInterface
  ): readonly [number, number] {
    const baseline = authored === undefined
      ? source
      : [RoleGeometry.rangeCenter(authored), RoleGeometry.rangeCenter(authored)] as const;
    const result = ContrastFeasibility.projectedCoordinateRange(authored, baseline, options);
    return result;
  }

  private static projectedCoordinateRange(
    authored: readonly [number, number] | undefined,
    baseline: readonly [number, number],
    options: CoordinateProjectionOptionsInterface
  ): readonly [number, number] {
    const lower = Math.min(baseline[0], baseline[1]) - (options.tolerance ?? 0);
    const upper = Math.max(baseline[0], baseline[1]) + (options.tolerance ?? 0);
    const envelope = authored ?? [options.minimum, options.maximum] as const;
    const clampedLower = Math.max(options.minimum, envelope[0], lower);
    const clampedUpper = Math.min(options.maximum, envelope[1], upper);
    if (clampedLower <= clampedUpper) {
      const result: readonly [number, number] = [clampedLower, clampedUpper];
      return result;
    }
    const edge = upper < envelope[0] ? envelope[0] : envelope[1];
    const result: readonly [number, number] = [edge, edge];
    return result;
  }

  private static sourceLessOptions(
    roleName: string,
    definition: RelationshipConstraintDomain['relationship']
  ): RoleDomainOptionsInterface | undefined {
    if (definition.operation !== 'hue-target') {
      return undefined;
    }
    const clamp = definition.clamp ?? RoleGeometry.DEFAULT_HUE_CLAMP;
    const hue = clamp >= 180
      ? { 'resolvedHue': definition.hue }
      : {
        'hueArcs': ContrastFeasibility.hueArcsFor(definition.hue, clamp),
        'relation': ContrastFeasibility.targetOwnRelation(roleName, definition.hue, clamp)
      };
    const result: RoleDomainOptionsInterface = {
      ...(hue.hueArcs === undefined ? {} : { 'hueArcs': hue.hueArcs }),
      ...(hue.relation === undefined ? {} : { 'relation': hue.relation }),
      ...(hue.resolvedHue === undefined ? {} : { 'resolvedHue': hue.resolvedHue })
    };
    return result;
  }

  private static targetOwnRelation(
    root: string,
    hue: number,
    clamp: number
  ): HueRelationInterface {
    const result: HueRelationInterface = {
      'resolve': (rootHue: number): number => {
        const resolved = RoleGeometry.hueTowards(rootHue, hue, clamp);
        return resolved;
      },
      'root': root
    };
    return result;
  }

  private static targetRelation(
    source: RoleDomainInterface,
    hue: number,
    clamp: number
  ): HueRelationInterface {
    const sourceRelation = source.relation;
    const result: HueRelationInterface = {
      'resolve': (rootHue: number): number => {
        const sourceHue = sourceRelation?.resolve(rootHue) ?? rootHue;
        const resolved = RoleGeometry.hueTowards(sourceHue, hue, clamp);
        return resolved;
      },
      'root': sourceRelation?.root ?? source.name
    };
    return result;
  }

  private static offsetRelation(
    source: RoleDomainInterface,
    offset: number
  ): HueRelationInterface {
    const sourceRelation = source.relation;
    const affineOffset = sourceRelation === undefined ? 0 : sourceRelation.affineOffset;
    const result: HueRelationInterface = {
      ...(affineOffset === undefined ? {} : { 'affineOffset': ContrastFeasibility.normalizeHue(affineOffset + offset) }),
      'resolve': (rootHue: number): number => {
        const sourceHue = sourceRelation?.resolve(rootHue) ?? rootHue;
        const resolved = ContrastFeasibility.normalizeHue(sourceHue + offset);
        return resolved;
      },
      'root': sourceRelation?.root ?? source.name
    };
    return result;
  }

  private static hueArcsFor(hue: number, tolerance: number): readonly HueArcInterface[] {
    const lower = hue - tolerance;
    const upper = hue + tolerance;
    if (lower < 0) {
      return [{ 'end': upper, 'start': 0 }, { 'end': 360, 'start': lower + 360 }];
    }
    if (upper > 360) {
      return [{ 'end': upper - 360, 'start': 0 }, { 'end': 360, 'start': lower }];
    }
    return [{ 'end': upper, 'start': lower }];
  }

  private static normalizeHue(value: number): number {
    const result = ((value % 360) + 360) % 360;
    return result;
  }

  private static roleIndex(
    schema: RoleSchemaEntity.Type
  ): ReadonlyMap<string, RoleSchemaEntity.Type['roles'][number]> {
    const result = new Map<string, RoleSchemaEntity.Type['roles'][number]>();
    for (let index = 0; index < schema.roles.length; index += 1) {
      const role = schema.roles[index];
      if (role !== undefined) {
        result.set(role.name, role);
      }
    }
    return result;
  }

  private static midpointRoles(
    domains: ReadonlyMap<string, RoleDomainInterface>
  ): Record<string, ColorRecordEntity.Type> {
    const result: Record<string, ColorRecordEntity.Type> = {};
    for (const [name, domain] of domains) {
      Object.defineProperty(result, name, {
        'configurable': true,
        'enumerable': true,
        'value': ContrastFeasibilityDomain.record(
          domain,
          (domain.lightness[0] + domain.lightness[1]) / 2,
          (domain.chroma[0] + domain.chroma[1]) / 2,
          0
        ),
        'writable': true
      });
    }
    return result;
  }

  private static report(
    domains: ReadonlyMap<string, RoleDomainInterface>,
    input: PaletteStateInterface['input'],
    roles: Record<string, ColorRecordEntity.Type>,
    pairKeys?: ReadonlySet<string>
  ): ContrastFeasibilityReportEntity.Type {
    const requirements = ContrastPolicy.normalize(input, PaletteRoleState.admit(roles));
    const pairs: ContrastPairFeasibilityEntity.Type[] = [];
    for (let index = 0; index < requirements.length; index += 1) {
      const requirement = requirements[index];
      if (requirement === undefined) {
        continue;
      }
      if (pairKeys !== undefined && !pairKeys.has(CompositeKey.of(requirement.foreground, requirement.background))) {
        continue;
      }
      const foreground = domains.get(requirement.foreground);
      const background = domains.get(requirement.background);
      if (foreground !== undefined && background !== undefined) {
        const pair = ContrastFeasibility.requiresCompositeMeasurement(foreground, background)
          ? ContrastFeasibilityDomain.sampledIndeterminate(foreground, background, requirement)
          : ContrastFeasibilityDomain.analyzePair(foreground, background, requirement);
        pairs.push(pair);
      }
    }
    const result = ContrastFeasibilityReportEntity.create({ 'pairs': pairs });
    return result;
  }


  private static requiresCompositeMeasurement(
    foreground: RoleDomainInterface,
    background: RoleDomainInterface
  ): boolean {
    const foregroundOperation = foreground.relationship?.operation;
    const backgroundOperation = background.relationship?.operation;
    const result =
      foregroundOperation === 'alpha-overlay' ||
      foregroundOperation === 'oklch-interpolate' ||
      backgroundOperation === 'alpha-overlay' ||
      backgroundOperation === 'oklch-interpolate';
    return result;
  }
}
