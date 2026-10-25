import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface
} from '@studnicky/iridis';

import {
  contrastApca,
  ContrastReportEntryEntity,
  contrastWcag21,
  Metadata,
  TaskManifestEntity
} from '@studnicky/iridis';

import type { CvdPairWarningEntity } from '../entities/CvdPairWarningEntity.ts';

import { ContrastFeasibility } from '../ContrastFeasibility.ts';
import { CvdEvaluator } from '../CvdEvaluator.ts';
import { CvdFailurePolicy } from '../CvdFailurePolicy.ts';
import { CompliancePairEntity } from '../entities/CompliancePairEntity.ts';
import { ComplianceReportEntity } from '../entities/ComplianceReportEntity.ts';
import { CvdResultSetEntity } from '../entities/CvdResultSetEntity.ts';

class ComplianceSnapshot {
  static matches(state: PaletteStateInterface): boolean {
    const report = Metadata.contrastReport(state.metadata);
    if (report === undefined) {
      return true;
    }
    for (let index = 0; index < report.pairs.length; index += 1) {
      const pair = report.pairs[index];
      if (pair === undefined) {
        continue;
      }
      const foreground = state.roles[pair.foreground];
      const background = state.roles[pair.background];
      if (foreground === undefined || background === undefined) {
        return false;
      }
      const actual = report.selected.algorithm === 'apca'
        ? Math.abs(contrastApca.apply(foreground, background))
        : contrastWcag21.apply(foreground, background);
      if (Math.abs(actual - pair.actual) > 1e-12) {
        return false;
      }
    }
    return true;
  }
}

class ComplianceSerialization {
  static report(state: PaletteStateInterface): ComplianceReportEntity.Type | undefined {
    const diagnostic = Metadata.contrastReport(state.metadata);
    if (diagnostic === undefined) {
      return undefined;
    }
    const cvd = CvdResultSetEntity.intake(state.metadata['contrast:cvd'] ?? {
      'blocked': [],
      'corrections': [],
      'relationshipCandidateRejections': {},
      'warnings': []
    });
    const failurePolicy = CvdFailurePolicy.resolve(state.input.contrast);
    const blockers = ComplianceSerialization.blockers(cvd.blocked);
    const diagnosticPairs = diagnostic.pairs.map((pair) => {
      const result = ContrastReportEntryEntity.intake(pair);
      return result;
    });
    const pairs = ComplianceSerialization.pairs(
      diagnosticPairs,
      cvd.warnings,
      cvd.corrections,
      failurePolicy,
      blockers
    );
    pairs.sort(ComplianceSerialization.comparePairs);
    const proofedPairs = ComplianceSerialization.attachProofs(state, pairs);
    const problemPairs = proofedPairs.filter((pair) => {
      const result = !pair.passed;
      return result;
    });
    const compliant = problemPairs.length === 0;
    const result = ComplianceReportEntity.intake({
      'compliant': compliant,
      'disposition': compliant ? 'resolved' : 'best-effort',
      'pairs': proofedPairs,
      'problemPairs': problemPairs,
      'selected': diagnostic.selected
    });
    return result;
  }

  private static attachProofs(
    state: PaletteStateInterface,
    pairs: readonly CompliancePairEntity.Type[]
  ): CompliancePairEntity.Type[] {
    const hasProblems = pairs.some((pair): boolean => {
      const result = !pair.passed;
      return result;
    });
    if (!hasProblems) {
      const result = [...pairs];
      return result;
    }
    const feasibility = ContrastFeasibility.proveRun(state);
    const proofs = new Map<string, NonNullable<typeof feasibility.pairs[number]['proof']>>();
    for (let index = 0; index < feasibility.pairs.length; index += 1) {
      const pair = feasibility.pairs[index];
      if (pair?.proof !== undefined) {
        proofs.set(ComplianceSerialization.key(pair.foreground, pair.background), pair.proof);
      }
    }
    const result = pairs.map((pair): CompliancePairEntity.Type => {
      const proof = pair.passed
        ? undefined
        : proofs.get(ComplianceSerialization.key(pair.foreground, pair.background));
      if (proof === undefined) {
        return pair;
      }
      const result = CompliancePairEntity.intake({ ...pair, 'proof': proof });
      return result;
    });
    return result;
  }

  private static blockers(
    blockedPairs: readonly CvdResultSetEntity.Type['blocked'][number][]
  ): ReadonlyMap<string, ReadonlySet<CompliancePairEntity.Type['constraints'][number]>> {
    const result = new Map<
      string,
      Set<CompliancePairEntity.Type['constraints'][number]>
    >();
    for (let index = 0; index < blockedPairs.length; index += 1) {
      const blocked = blockedPairs[index];
      if (blocked?.reason !== 'stated-both') {
        continue;
      }
      const key = ComplianceSerialization.key(blocked.foreground, blocked.background);
      const constraints = result.get(key) ?? new Set<CompliancePairEntity.Type['constraints'][number]>();
      constraints.add('pin');
      result.set(key, constraints);
    }
    return result;
  }

  private static comparePairs(
    left: CompliancePairEntity.Type,
    right: CompliancePairEntity.Type
  ): number {
    const foreground = left.foreground.localeCompare(right.foreground);
    const result = foreground === 0
      ? left.background.localeCompare(right.background)
      : foreground;
    return result;
  }

  private static cvdConstraints(
    pair: ContrastReportEntryEntity.Type,
    warnings: readonly CvdPairWarningEntity.Type[],
    failurePolicy: CvdFailurePolicy
  ): ReadonlySet<CompliancePairEntity.Type['constraints'][number]> {
    const result = new Set<CompliancePairEntity.Type['constraints'][number]>();
    for (let index = 0; index < warnings.length; index += 1) {
      const warning = warnings[index];
      if (warning?.foreground !== pair.foreground || warning.background !== pair.background) {
        continue;
      }
      const evidence = CvdEvaluator.fromWarning(warning, failurePolicy);
      if (evidence.belowFloor && failurePolicy.blocks(evidence)) {
        result.add('cvd-floor');
      }
      if (evidence.exceedsDrop && failurePolicy.blocks(evidence)) {
        result.add('cvd-drop');
      }
    }
    return result;
  }

  private static pairs(
    diagnostics: readonly ContrastReportEntryEntity.Type[],
    warnings: readonly CvdPairWarningEntity.Type[],
    corrections: CvdResultSetEntity.Type['corrections'],
    failurePolicy: CvdFailurePolicy,
    blockers: ReadonlyMap<string, ReadonlySet<CompliancePairEntity.Type['constraints'][number]>>
  ): CompliancePairEntity.Type[] {
    const pairs: CompliancePairEntity.Type[] = [];
    for (let index = 0; index < diagnostics.length; index += 1) {
      const pair = diagnostics[index];
      if (pair === undefined) {
        continue;
      }
      pairs.push(ComplianceSerialization.pair(
        pair,
        warnings,
        corrections,
        failurePolicy,
        blockers
      ));
    }
    return pairs;
  }

  private static pair(
    pair: ContrastReportEntryEntity.Type,
    warnings: readonly CvdPairWarningEntity.Type[],
    corrections: CvdResultSetEntity.Type['corrections'],
    failurePolicy: CvdFailurePolicy,
    blockers: ReadonlyMap<string, ReadonlySet<CompliancePairEntity.Type['constraints'][number]>>
  ): CompliancePairEntity.Type {
    const constraints = new Set<CompliancePairEntity.Type['constraints'][number]>(pair.constraints);
    const cvdConstraints = ComplianceSerialization.cvdConstraints(pair, warnings, failurePolicy);
    for (const constraint of cvdConstraints) {
      constraints.add(constraint);
    }
    const blockerConstraints = blockers.get(ComplianceSerialization.key(pair.foreground, pair.background));
    if (blockerConstraints !== undefined) {
      for (const constraint of blockerConstraints) {
        constraints.add(constraint);
      }
    }
    const passed = pair.passed && constraints.size === 0;
    const result = CompliancePairEntity.intake({
      'actual': pair.actual,
      'adjustedRoles': ComplianceSerialization.adjustedRoles(pair, corrections),
      'background': pair.background,
      'constraints': passed
        ? []
        : Array.from(constraints).sort((left, right) => {
          const result = left.localeCompare(right);
          return result;
        }),
      'foreground': pair.foreground,
      'passed': passed,
      ...(pair.relationIds === undefined
        ? {}
        : { 'relationIds': ComplianceSerialization.relationIds(pair.relationIds) }),
      'required': pair.required,
      'shortfall': pair.shortfall
    });
    return result;
  }

  private static relationIds(relationIds: readonly string[]): string[] {
    const result = Array.from(new Set(relationIds));
    result.sort((left, right) => {
      const comparison = left.localeCompare(right);
      return comparison;
    });
    return result;
  }

  private static adjustedRoles(
    pair: ContrastReportEntryEntity.Type,
    corrections: CvdResultSetEntity.Type['corrections']
  ): string[] {
    const result = [...pair.adjustedRoles];
    const names = new Set(result);
    for (let index = 0; index < corrections.length; index += 1) {
      const correction = corrections[index];
      if (correction?.foreground !== pair.foreground || correction.background !== pair.background) {
        continue;
      }
      for (let roleIndex = 0; roleIndex < correction.adjustedRoles.length; roleIndex += 1) {
        const role = correction.adjustedRoles[roleIndex];
        if (role !== undefined && !names.has(role)) {
          names.add(role);
          result.push(role);
        }
      }
    }
    return result;
  }

  private static key(foreground: string, background: string): string {
    const result = foreground + String.fromCharCode(0) + background;
    return result;
  }
}

/** Serializes the terminal compliance result without changing the resolved role colors. */
class ReportCompliance implements TaskInterface {
  readonly 'name' = 'report:compliance';

  readonly 'manifest' = TaskManifestEntity.create({
    'description': 'Serializes the completed terminal compliance result for rendered role colors without mutating roles.',
    'name': 'report:compliance',
    'reads': [
      'roles',
      'input.contrast',
      'input.roles',
      "metadata['contrast:cvd']",
      "metadata['core:contrastReport']",
      "metadata['core:roleProvenance']"
    ],
    'writes': ["metadata['contrast:complianceReport']"]
  });

  run(state: PaletteStateInterface, _context: PipelineContextInterface): void {
    if (!ComplianceSnapshot.matches(state)) {
      throw new TypeError('Rendered roles differ from the completed compliance result');
    }
    const report = ComplianceSerialization.report(state);
    if (report !== undefined) {
      state.metadata['contrast:complianceReport'] = report;
    }
  }
}

export const reportCompliance = new ReportCompliance();
