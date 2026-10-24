import type {
  ColorRecordEntity,
  PaletteStateInterface
} from '@studnicky/iridis';

import {
  colorRecordFactory,
  deltaE2000,
  InputEntity,
  Metadata,
  RuntimeOptionsEntity as RuntimeOptions
} from '@studnicky/iridis';
import { ComplianceReportEntity } from '@studnicky/iridis-contrast';
import { JsonValue } from '@studnicky/types/node';

import { enforceCvdSimulate } from '../src/tasks/EnforceCvdSimulate.ts';
import { contrastCoordinateCounters } from '../../core/src/tasks/enforce/ContrastCoordinateCounters.ts';
import { COLOR_PIPELINE } from '../../../site/app/composables/colorPipeline.ts';
import { ContrastConfigFor } from '../../../site/app/composables/contrastConfigFor.ts';
import { createColorEngine } from '../../../site/app/composables/createColorEngine.ts';
import { ContrastConfigOptionsEntity } from '../../../site/app/composables/entities/ContrastConfigOptionsEntity.ts';
import { DerivationConfigEntity } from '../../../site/app/composables/entities/DerivationConfigEntity.ts';
import { VARIANT_CONFIG } from '../../../site/app/composables/variantConfig.ts';
import { roleSchemaByName } from '../../../site/app/theme/RoleSchemaByName.ts';
import { SeedInputEntity } from '../../../site/app/theme/types/SeedInputEntity.ts';


interface DistributionInterface {
  readonly 'max': number;
  readonly 'mean': number;
  readonly 'p95': number;
  readonly 'sum': number;
}

interface DisplacementInterface {
  readonly 'deltaE2000': DistributionInterface;
  readonly 'deltaEOk': DistributionInterface;
  readonly 'lightness': DistributionInterface;
  readonly 'chroma': DistributionInterface;
}

interface OptimizerUsageInterface {
  readonly 'candidateCount': number;
  readonly 'candidateScoreCalls': number;
  readonly 'optimizerPasses': number;
  readonly 'repairPasses': number;
}

interface RunInterface {
  readonly 'authored': PaletteStateInterface;
  readonly 'budget': { readonly 'candidateScores': number; readonly 'weightedUnits': number };
  readonly 'elapsedMs': number;
  readonly 'optimizer': OptimizerUsageInterface;
  readonly 'resolved': PaletteStateInterface;
}

interface CaseInterface {
  readonly 'framing': 'dark' | 'light';
  readonly 'options': ContrastConfigOptionsEntity.Type;
  readonly 'schema': string;
  readonly 'seeds': readonly string[];
}

interface RoleReferenceInterface {
  readonly 'fixedHue': boolean;
  readonly 'group': 'relationship-hued' | 'seed-faithful';
  readonly 'record': ColorRecordEntity.Type;
}

class PaletteInput {
  static create(benchmarkCase: CaseInterface): InputEntity.Type {
    const roles = roleSchemaByName[benchmarkCase.schema as keyof typeof roleSchemaByName][benchmarkCase.framing];
    const runtime = RuntimeOptions.create({ 'colorSpace': 'srgb', 'framing': benchmarkCase.framing });
    const colors = benchmarkCase.seeds.map((seed) => {
      const result = SeedInputEntity.intake(seed);
      return result;
    });
    const result = InputEntity.create({
      'colors': colors,
      'contrast': ContrastConfigFor.forOptions(benchmarkCase.options),
      'metadata': {
        'core:variantConfig': JsonValue.from(VARIANT_CONFIG),
        'derivation:config': JsonValue.from(DerivationConfigEntity.defaultValue),
        'derivation:semanticHuesEnabled': true
      },
      'roles': roles,
      'runtime': runtime
    });
    return result;
  }
}

class SweepCases {
  static create(): readonly CaseInterface[] {
    const result: CaseInterface[] = [];
    const schemas = ['iridis-4', 'iridis-8', 'iridis-12', 'iridis-16', 'iridis-32'] as const;
    for (let seedIndex = 0; seedIndex < SweepCases.seedSets().length; seedIndex += 1) {
      const seeds = SweepCases.seedSets()[seedIndex];
      if (seeds === undefined) {
        continue;
      }
      for (let schemaIndex = 0; schemaIndex < schemas.length; schemaIndex += 1) {
        const schema = schemas[schemaIndex];
        if (schema === undefined) {
          continue;
        }
        for (const framing of ['dark', 'light'] as const) {
          for (const nonMandatoryLevel of ['AA', 'AAA'] as const) {
            for (let strictness = 0; strictness < 3; strictness += 1) {
              result.push({
                'framing': framing,
                'options': ContrastConfigOptionsEntity.create({
                  'cvdMode': cvdMode,
                  'enableStrictCompliance': false,
                  'nonMandatoryLevel': nonMandatoryLevel,
                  'strictness': strictness
                }),
                'schema': schema,
                'seeds': seeds
              });
            }
          }
        }
      }
    }
    return result;
  }

  private static seedSets(): readonly (readonly string[])[] {
    const result: (readonly string[])[] = [];
    for (let hue = 0; hue < 360; hue += 30) {
      for (const saturation of [0.35, 0.8]) {
        for (const lightness of [0.3, 0.55]) {
          result.push([
            SweepCases.hslHex(hue, saturation, lightness),
            '#ffffff',
            '#000000'
          ]);
        }
      }
    }
    return result;
  }

  private static hslHex(hue: number, saturation: number, lightness: number): string {
    const chroma = saturation * Math.min(lightness, 1 - lightness);
    const channel = (index: number): string => {
      const sector = (index + hue / 30) % 12;
      const value = lightness - chroma * Math.max(-1, Math.min(sector - 3, 9 - sector, 1));
      const result = Math.round(value * 255).toString(16).padStart(2, '0');
      return result;
    };
    const result = `#${channel(0)}${channel(8)}${channel(4)}`;
    return result;
  }
}

class SweepRun {
  static execute(input: InputEntity.Type): RunInterface {
    const authoredEngine = createColorEngine();
    authoredEngine.pipeline([
      'intake:hexHint',
      'derive:semanticHues',
      'resolve:roles',
      'pin:derivedRoles',
      'derive:roleRelations',
      'expand:family'
    ]);
    const authored = authoredEngine.run(input);
    const engine = createColorEngine();
    engine.pipeline(COLOR_PIPELINE);
    enforceCvdSimulate.configureSearchBudgetForTesting(8_000, 48_000);
    contrastCoordinateCounters.begin();
    const started = performance.now();
    try {
      const resolved = engine.run(input);
      const budget = enforceCvdSimulate.searchBudgetUsageForTesting() ?? {
        'candidateScores': 0,
        'weightedUnits': 0
      };
      const optimizer = contrastCoordinateCounters.end();
      const result: RunInterface = {
        'authored': authored,
        'budget': budget,
        'elapsedMs': performance.now() - started,
        'optimizer': optimizer,
        'resolved': resolved
      };
      return result;
    } finally {
      if (contrastCoordinateCounters.enabled) {
        contrastCoordinateCounters.end();
      }
      enforceCvdSimulate.clearSearchBudgetForTesting();
    }
  }
}

class SeedReference {
  static resolve(
    authored: PaletteStateInterface,
    seeds: readonly string[]
  ): ReadonlyMap<string, RoleReferenceInterface> {
    const rawByHex = new Map<string, ColorRecordEntity.Type>();
    for (let index = 0; index < seeds.length; index += 1) {
      const seed = seeds[index];
      if (seed !== undefined) {
        rawByHex.set(seed.toLowerCase(), colorRecordFactory.fromHex(seed));
      }
    }
    const distances = Metadata.roleDistances(authored.metadata);
    const result = new Map<string, RoleReferenceInterface>();
    for (const [roleName, record] of Object.entries(authored.roles)) {
      const raw = SeedReference.closestSeed(distances.get(roleName), rawByHex);
      const fixedHue = SeedReference.hasAuthoredHueRelationship(authored, roleName);
      if (raw === undefined) {
        result.set(roleName, {
          'fixedHue': fixedHue,
          'group': 'relationship-hued',
          'record': record
        });
        continue;
      }
      if (!fixedHue) {
        result.set(roleName, {
          'fixedHue': false,
          'group': 'seed-faithful',
          'record': raw
        });
        continue;
      }
      result.set(roleName, {
        'fixedHue': true,
        'group': 'relationship-hued',
        'record': colorRecordFactory.fromOklch(raw.oklch.l, raw.oklch.c, record.oklch.h, {
          'alpha': record.alpha,
          'hints': record.hints,
          'origin': record
        })
      });
    }
    return result;
  }

  private static hasAuthoredHueRelationship(
    authored: PaletteStateInterface,
    roleName: string
  ): boolean {
    const definition = authored.input.roles?.roles.find((role) => {
      const result = role.name === roleName;
      return result;
    });
    const result =
      definition?.derivedFrom !== undefined ||
      definition?.hue !== undefined ||
      definition?.hueOffset !== undefined ||
      Metadata.hueTargetOverrides(authored.metadata)?.[roleName] !== undefined;
    return result;
  }

  private static closestSeed(
    distances: ReadonlyMap<string, number> | undefined,
    rawByHex: ReadonlyMap<string, ColorRecordEntity.Type>
  ): ColorRecordEntity.Type | undefined {
    if (distances === undefined) {
      return undefined;
    }
    const ordered = Array.from(distances.entries()).toSorted((left, right) => {
      const distance = left[1] - right[1];
      const result = distance === 0 ? left[0].localeCompare(right[0]) : distance;
      return result;
    });
    const hex = ordered.at(0)?.[0];
    const result = hex === undefined ? undefined : rawByHex.get(hex.toLowerCase());
    return result;
  }
}

class Displacement {
  static deltaEOk(left: ColorRecordEntity.Type, right: ColorRecordEntity.Type): number {
    const leftHue = (left.oklch.h * Math.PI) / 180;
    const rightHue = (right.oklch.h * Math.PI) / 180;
    const result = Math.hypot(
      left.oklch.l - right.oklch.l,
      left.oklch.c * Math.cos(leftHue) - right.oklch.c * Math.cos(rightHue),
      left.oklch.c * Math.sin(leftHue) - right.oklch.c * Math.sin(rightHue)
    );
    return result;
  }

  static report(values: readonly number[]): DistributionInterface {
    const sorted = values.toSorted((left, right) => { return left - right; });
    const sum = sorted.reduce((total, value) => { return total + value; }, 0);
    const p95 = sorted.at(Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)) ?? 0;
    const result: DistributionInterface = {
      'max': sorted.at(-1) ?? 0,
      'mean': sorted.length === 0 ? 0 : sum / sorted.length,
      'p95': p95,
      'sum': sum
    };
    return result;
  }
}

class DisplacementSamples {
  readonly chroma: number[] = [];
  readonly deltaE2000: number[] = [];
  readonly deltaEOk: number[] = [];
  readonly lightness: number[] = [];

  add(reference: ColorRecordEntity.Type, resolved: ColorRecordEntity.Type): void {
    this.deltaE2000.push(deltaE2000.apply(reference, resolved));
    this.deltaEOk.push(Displacement.deltaEOk(reference, resolved));
    this.lightness.push(Math.abs(reference.oklch.l - resolved.oklch.l));
    this.chroma.push(Math.abs(reference.oklch.c - resolved.oklch.c));
  }

  report(): DisplacementInterface {
    const result: DisplacementInterface = {
      'chroma': Displacement.report(this.chroma),
      'deltaE2000': Displacement.report(this.deltaE2000),
      'deltaEOk': Displacement.report(this.deltaEOk),
      'lightness': Displacement.report(this.lightness)
    };
    return result;
  }
}

class SweepReport {
  static create(cases: readonly CaseInterface[]): object {
    const chunkStarted = performance.now();
    const seedFaithful = new DisplacementSamples();
    const relationshipHued = new DisplacementSamples();
    const fixedHueRoles = new Set<string>();
    const failures: object[] = [];
    let candidateScores = 0;
    let compliantCases = 0;
    let movedRoles = 0;
    let maximumCandidateScores = 0;
    let maximumCaseElapsedMs = 0;
    let slowestCase: (CaseInterface & { readonly 'elapsedMs': number }) | undefined;
    let maximumWeightedUnits = 0;
    let maximumOptimizerCandidateCount = 0;
    let maximumOptimizerCandidateScoreCalls = 0;
    let maximumOptimizerPasses = 0;
    let maximumOptimizerRepairPasses = 0;
    let runtimeMs = 0;
    let weightedUnits = 0;
    for (let index = 0; index < cases.length; index += 1) {
      const benchmarkCase = cases[index];
      if (benchmarkCase === undefined) {
        continue;
      }
      const input = PaletteInput.create(benchmarkCase);
      const run = SweepRun.execute(input);
      const report = ComplianceReportEntity.intake(run.resolved.metadata['contrast:complianceReport']);
      if (report.compliant) {
        compliantCases += 1;
      } else {
        const problemPairs = report.problemPairs.map((pair) => {
          return {
            'actual': pair.actual,
            'background': pair.background,
            'constraints': pair.constraints,
            'foreground': pair.foreground,
            'required': pair.required,
            'shortfall': pair.shortfall
          };
        });
        const failedRoleNames = new Set<string>();
        for (const pair of problemPairs) {
          failedRoleNames.add(pair.foreground);
          failedRoleNames.add(pair.background);
        }
        failures.push({
          'cvdMode': benchmarkCase.options.cvdMode,
          'framing': benchmarkCase.framing,
          'nonMandatoryLevel': benchmarkCase.options.nonMandatoryLevel,
          'problemPairs': problemPairs,
          'roles': Array.from(failedRoleNames).toSorted().map((roleName) => {
            const record = run.resolved.roles[roleName];
            const definition = input.roles?.roles.find((role) => {
              return role.name === roleName;
            });
            return {
              'chromaRange': definition?.chromaRange,
              'hex': record?.hex,
              'lightnessRange': definition?.lightnessRange,
              'oklch': record?.oklch,
              'roleName': roleName
            };
          }),
          'schema': benchmarkCase.schema,
          'seeds': benchmarkCase.seeds,
          'strictness': benchmarkCase.options.strictness
        });
      }
      candidateScores += run.budget.candidateScores;
      maximumCandidateScores = Math.max(maximumCandidateScores, run.budget.candidateScores);
      maximumWeightedUnits = Math.max(maximumWeightedUnits, run.budget.weightedUnits);
      maximumOptimizerCandidateCount = Math.max(maximumOptimizerCandidateCount, run.optimizer.candidateCount);
      maximumOptimizerCandidateScoreCalls = Math.max(maximumOptimizerCandidateScoreCalls, run.optimizer.candidateScoreCalls);
      maximumOptimizerPasses = Math.max(maximumOptimizerPasses, run.optimizer.optimizerPasses);
      maximumOptimizerRepairPasses = Math.max(maximumOptimizerRepairPasses, run.optimizer.repairPasses);
      weightedUnits += run.budget.weightedUnits;
      runtimeMs += run.elapsedMs;
      if (run.elapsedMs > maximumCaseElapsedMs) {
        maximumCaseElapsedMs = run.elapsedMs;
        slowestCase = { ...benchmarkCase, 'elapsedMs': run.elapsedMs };
      }
      const references = SeedReference.resolve(run.authored, benchmarkCase.seeds);
      for (const [roleName, resolved] of Object.entries(run.resolved.roles)) {
        const reference = references.get(roleName);
        if (reference === undefined) {
          continue;
        }
        if (reference.fixedHue) {
          fixedHueRoles.add(roleName);
        }
        const samples = reference.group === 'seed-faithful'
          ? seedFaithful
          : relationshipHued;
        samples.add(reference.record, resolved);
        if (Displacement.deltaEOk(reference.record, resolved) > 1e-12) {
          movedRoles += 1;
        }
      }
    }
    return {
      'budgetUsage': { 'candidateScores': candidateScores, 'weightedUnits': weightedUnits },
      'chunkElapsedMs': performance.now() - chunkStarted,
      'maximumCaseElapsedMs': maximumCaseElapsedMs,
      ...(slowestCase === undefined ? {} : { 'slowestCase': slowestCase }),
      'maximumOptimizerUsage': {
        'candidateCount': maximumOptimizerCandidateCount,
        'candidateScoreCalls': maximumOptimizerCandidateScoreCalls,
        'optimizerPasses': maximumOptimizerPasses,
        'repairPasses': maximumOptimizerRepairPasses
      },
      'maximumBudgetUsage': {
        'candidateScores': maximumCandidateScores,
        'weightedUnits': maximumWeightedUnits
      },
      'caseCount': cases.length,
      'complianceRate': cases.length === 0 ? 0 : compliantCases / cases.length,
      'compliantCases': compliantCases,
      'failures': failures,
      'fixedHueRoles': Array.from(fixedHueRoles).toSorted(),
      'movedRoles': movedRoles,
      'relationshipHuedDisplacement': relationshipHued.report(),
      'runtimeMs': runtimeMs,
      'seedFaithfulDisplacement': seedFaithful.report(),
      'strategy': 'S2-component-coordinate'
    };
  }
}

const cvdModeText = process.argv.find((argument) => { return argument.startsWith('--cvdMode='); });
const cvdMode = cvdModeText?.slice('--cvdMode='.length) ?? 'nudge';
if (cvdMode !== 'warn' && cvdMode !== 'nudge' && cvdMode !== 'enforce') {
  throw new Error('--cvdMode must be warn, nudge, or enforce');
}
const limitText = process.argv.find((argument) => { return argument.startsWith('--limit='); });
const offsetText = process.argv.find((argument) => { return argument.startsWith('--offset='); });
const limit = limitText === undefined ? undefined : Number.parseInt(limitText.slice('--limit='.length), 10);
const offset = offsetText === undefined ? 0 : Number.parseInt(offsetText.slice('--offset='.length), 10);
if (!Number.isInteger(offset) || offset < 0) {
  throw new Error('--offset must be a non-negative integer');
}
const allCases = SweepCases.create();
const cases = limit === undefined ? allCases.slice(offset) : allCases.slice(offset, offset + limit);
console.log(JSON.stringify(SweepReport.create(cases), undefined, 2));
