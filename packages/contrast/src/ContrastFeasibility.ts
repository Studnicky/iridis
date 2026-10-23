import type {
  ColorHintsEntity,
  ColorRecordEntity,
  ContrastOptionsEntity,
  PaletteStateInterface
} from '@studnicky/iridis';

import {
  colorRecordFactory,
  contrastApca,
  contrastWcag21,
  InputEntity,
  Metadata,
  PaletteRoleState,
  RoleSchemaEntity
} from '@studnicky/iridis';
import { ContrastPolicy } from '@studnicky/iridis/tasks';

import { ContrastFeasibilityProofEntity } from './entities/ContrastFeasibilityProofEntity.ts';
import { ContrastFeasibilityReportEntity } from './entities/ContrastFeasibilityReportEntity.ts';
import { ContrastPairFeasibilityEntity } from './entities/ContrastPairFeasibilityEntity.ts';
import { ContrastSampledFeasibilityEvidenceEntity } from './entities/ContrastSampledFeasibilityEvidenceEntity.ts';
import { HueRangeEntity } from './entities/HueRangeEntity.ts';

interface ColorExtremaInterface {
  readonly 'maximum': ColorRecordEntity.Type;
  readonly 'minimum': ColorRecordEntity.Type;
}

interface HueEvaluationInterface {
  readonly 'actual': number;
  readonly 'background': ColorRecordEntity.Type;
  readonly 'foreground': ColorRecordEntity.Type;
  readonly 'hue': number;
}

interface RoleDomainInterface {
  readonly 'chroma': readonly [number, number];
  readonly 'fixedRecord'?: ColorRecordEntity.Type;
  readonly 'hints'?: ColorHintsEntity.Type;
  readonly 'hue'?: number;
  readonly 'lightness': readonly [number, number];
  readonly 'name': string;
}

interface SearchCellInterface {
  readonly 'cMaximum': number;
  readonly 'cMinimum': number;
  readonly 'lMaximum': number;
  readonly 'lMinimum': number;
}

/**
 * Numerically evaluates schema envelopes through the same emitted sRGB records
 * and contrast primitives used by the engine. Hue cells terminate at 0.5° and
 * lightness/chroma cells terminate at 1/1024 and the gamut mapper's 0.02 chroma
 * just-noticeable-difference threshold. These are production-precision numeric
 * classifications, not symbolic claims about every real-valued hue.
 */
class ContrastFeasibilityDomain {
  static readonly #BLACK = colorRecordFactory.fromOklch(0, 0, 0);
  static readonly #CHROMA_PRECISION = 0.02;
  static readonly #HUE_PRECISION = 0.5;
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
    const evaluations = ContrastFeasibilityDomain.evaluateHues(foreground, background, requirement);
    const hasFixedHueDomain =
      (foreground.fixedRecord !== undefined || foreground.hue !== undefined) &&
      (background.fixedRecord !== undefined || background.hue !== undefined);
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

  static domain(
    role: RoleSchemaEntity.Type['roles'][number],
    fixedRecord?: ColorRecordEntity.Type
  ): RoleDomainInterface {
    const result: RoleDomainInterface = {
      'chroma': role.chromaRange ?? [0, 0.5],
      ...(fixedRecord === undefined ? {} : { 'fixedRecord': fixedRecord }),
      ...(role.hue === undefined ? {} : { 'hue': role.hue }),
      ...(role.intent === undefined ? {} : { 'hints': { 'intent': role.intent } }),
      'lightness': role.lightnessRange ?? [0, 1],
      'name': role.name
    };
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

  private static bestSample(
    candidates: readonly ColorRecordEntity.Type[],
    requirement: ContrastPolicy.RequirementInterface,
    isImprovement: (current: number, candidate: number) => boolean
  ): ColorRecordEntity.Type {
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

  private static evaluateHue(
    foreground: RoleDomainInterface,
    background: RoleDomainInterface,
    hue: number,
    requirement: ContrastPolicy.RequirementInterface
  ): HueEvaluationInterface {
    const foregroundExtrema = ContrastFeasibilityDomain.extrema(foreground, hue, requirement);
    const backgroundExtrema = ContrastFeasibilityDomain.extrema(background, hue, requirement);
    const foregroundRecords = [foregroundExtrema.minimum, foregroundExtrema.maximum];
    const backgroundRecords = [backgroundExtrema.minimum, backgroundExtrema.maximum];
    let actual = -Infinity;
    let selectedForeground = foregroundRecords[0];
    let selectedBackground = backgroundRecords[0];
    if (selectedForeground === undefined || selectedBackground === undefined) {
      throw new TypeError('Contrast feasibility extrema are empty');
    }
    for (let foregroundIndex = 0; foregroundIndex < foregroundRecords.length; foregroundIndex += 1) {
      const foregroundRecord = foregroundRecords[foregroundIndex];
      if (foregroundRecord === undefined) {
        continue;
      }
      for (let backgroundIndex = 0; backgroundIndex < backgroundRecords.length; backgroundIndex += 1) {
        const backgroundRecord = backgroundRecords[backgroundIndex];
        if (backgroundRecord === undefined) {
          continue;
        }
        const candidate = ContrastFeasibilityDomain.measure(foregroundRecord, backgroundRecord, requirement);
        if (candidate > actual) {
          actual = candidate;
          selectedForeground = foregroundRecord;
          selectedBackground = backgroundRecord;
        }
      }
    }
    return {
      'actual': actual,
      'background': selectedBackground,
      'foreground': selectedForeground,
      'hue': hue
    };
  }

  private static evaluateHues(
    foreground: RoleDomainInterface,
    background: RoleDomainInterface,
    requirement: ContrastPolicy.RequirementInterface
  ): readonly HueEvaluationInterface[] {
    if (foreground.hue !== undefined && background.hue !== undefined) {
      const result = [ContrastFeasibilityDomain.evaluateHue(foreground, background, 0, requirement)];
      return result;
    }
    const result: HueEvaluationInterface[] = [];
    ContrastFeasibilityDomain.subdivideHue(
      foreground,
      background,
      requirement,
      0,
      360,
      result
    );
    return result;
  }

  private static extrema(
    domain: RoleDomainInterface,
    hue: number,
    requirement: ContrastPolicy.RequirementInterface
  ): ColorExtremaInterface {
    if (domain.fixedRecord !== undefined) {
      return { 'maximum': domain.fixedRecord, 'minimum': domain.fixedRecord };
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
    record: ColorRecordEntity.Type
  ): readonly ContrastFeasibilityProofEntity.Type['limitingBounds'][number][] {
    if (domain.fixedRecord !== undefined) {
      return [{
        'channel': 'pin',
        'edge': 'fixed',
        'role': domain.name,
        'value': record.oklch.l
      }];
    }
    const result: ContrastFeasibilityProofEntity.Type['limitingBounds'] = [];
    const lightnessEdge = ContrastFeasibilityDomain.edge(domain.lightness, record.oklch.l);
    if (lightnessEdge !== undefined) {
      result.push({
        'channel': 'lightness',
        'edge': lightnessEdge,
        'role': domain.name,
        'value': record.oklch.l
      });
    }
    const chromaEdge = ContrastFeasibilityDomain.edge(domain.chroma, record.oklch.c);
    if (chromaEdge !== undefined) {
      result.push({
        'channel': 'chroma',
        'edge': chromaEdge,
        'role': domain.name,
        'value': record.oklch.c
      });
    }
    if (record.displayP3 !== undefined) {
      result.push({
        'channel': 'gamut',
        'edge': 'fixed',
        'role': domain.name,
        'value': record.oklch.c
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
    foreground: ColorRecordEntity.Type,
    background: ColorRecordEntity.Type,
    requirement: ContrastPolicy.RequirementInterface
  ): number {
    const result = requirement.algorithm === 'apca'
      ? Math.abs(contrastApca.apply(foreground, background))
      : contrastWcag21.apply(foreground, background);
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
  ): ColorRecordEntity.Type {
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
    const lLower = selected.oklch.l <= lMidpoint ? cell.lMinimum : lMidpoint;
    const lUpper = selected.oklch.l <= lMidpoint ? lMidpoint : cell.lMaximum;
    const cLower = selected.oklch.c <= cMidpoint ? cell.cMinimum : cMidpoint;
    const cUpper = selected.oklch.c <= cMidpoint ? cMidpoint : cell.cMaximum;
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
  ): readonly ColorRecordEntity.Type[] {
    const [lMidpoint, cMidpoint] = ContrastFeasibilityDomain.midpoint(cell);
    const lightness = [cell.lMinimum, lMidpoint, cell.lMaximum];
    const chroma = [cell.cMinimum, cMidpoint, cell.cMaximum];
    const result: ColorRecordEntity.Type[] = [];
    for (let lIndex = 0; lIndex < lightness.length; lIndex += 1) {
      const l = lightness[lIndex];
      if (l === undefined) {
        continue;
      }
      for (let cIndex = 0; cIndex < chroma.length; cIndex += 1) {
        const c = chroma[cIndex];
        if (c !== undefined) {
          result.push(ContrastFeasibilityDomain.record(domain, l, c, hue));
        }
      }
    }
    return result;
  }

  private static luminance(
    record: ColorRecordEntity.Type,
    requirement: ContrastPolicy.RequirementInterface
  ): number {
    const result = requirement.algorithm === 'apca'
      ? Math.abs(contrastApca.apply(record, ContrastFeasibilityDomain.#BLACK))
      : contrastWcag21.apply(record, ContrastFeasibilityDomain.#BLACK);
    return result;
  }

  private static subdivideHue(
    foreground: RoleDomainInterface,
    background: RoleDomainInterface,
    requirement: ContrastPolicy.RequirementInterface,
    start: number,
    end: number,
    result: HueEvaluationInterface[]
  ): void {
    const width = end - start;
    if (width <= ContrastFeasibilityDomain.#HUE_PRECISION) {
      result.push(ContrastFeasibilityDomain.evaluateHue(foreground, background, start, requirement));
      if (end === 360) {
        result.push(ContrastFeasibilityDomain.evaluateHue(foreground, background, end, requirement));
      }
      return;
    }
    const midpoint = (start + end) / 2;
    ContrastFeasibilityDomain.subdivideHue(foreground, background, requirement, start, midpoint, result);
    ContrastFeasibilityDomain.subdivideHue(foreground, background, requirement, midpoint, end, result);
  }
}

/** Numerically analyzes declared schema pairs and resolved-run constraints. */
export class ContrastFeasibility {
  static analyzeSchema(
    schema: RoleSchemaEntity.Type,
    options: ContrastOptionsEntity.Type
  ): ContrastFeasibilityReportEntity.Type {
    const domains = ContrastFeasibility.domains(schema);
    const roles = ContrastFeasibility.midpointRoles(domains);
    const input = InputEntity.intake({ 'colors': [], 'contrast': options, 'roles': schema });
    const result = ContrastFeasibility.report(domains, input, roles);
    return result;
  }

  static proveRun(state: PaletteStateInterface): ContrastFeasibilityReportEntity.Type {
    const schema = state.input.roles;
    if (schema === undefined) {
      const result = ContrastFeasibilityReportEntity.create({ 'pairs': [] });
      return result;
    }
    const provenance = Metadata.roleProvenance(state.metadata);
    const domains = ContrastFeasibility.domains(RoleSchemaEntity.intake(schema), { 'provenance': provenance, 'roles': state.roles });
    const result = ContrastFeasibility.report(domains, state.input, state.roles);
    return result;
  }

  private static domains(
    schema: RoleSchemaEntity.Type,
    options?: {
      readonly 'provenance'?: ReadonlyMap<string, { readonly 'origin': string }>;
      readonly 'roles'?: Readonly<Record<string, ColorRecordEntity.Type>>;
    }
  ): ReadonlyMap<string, RoleDomainInterface> {
    const result = new Map<string, RoleDomainInterface>();
    for (let index = 0; index < schema.roles.length; index += 1) {
      const role = schema.roles[index];
      if (role === undefined) {
        continue;
      }
      const resolved = options?.roles?.[role.name];
      const fixed = options?.provenance?.get(role.name)?.origin === 'stated' ? resolved : undefined;
      result.set(role.name, ContrastFeasibilityDomain.domain(role, fixed));
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
    roles: Record<string, ColorRecordEntity.Type>
  ): ContrastFeasibilityReportEntity.Type {
    const requirements = ContrastPolicy.normalize(input, PaletteRoleState.admit(roles));
    const pairs: ContrastPairFeasibilityEntity.Type[] = [];
    for (let index = 0; index < requirements.length; index += 1) {
      const requirement = requirements[index];
      if (requirement === undefined) {
        continue;
      }
      const foreground = domains.get(requirement.foreground);
      const background = domains.get(requirement.background);
      if (foreground !== undefined && background !== undefined) {
        pairs.push(ContrastFeasibilityDomain.analyzePair(foreground, background, requirement));
      }
    }
    const result = ContrastFeasibilityReportEntity.create({ 'pairs': pairs });
    return result;
  }
}
