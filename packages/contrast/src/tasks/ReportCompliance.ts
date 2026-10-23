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

import { CvdFailurePolicy } from '../CvdFailurePolicy.ts';
import { CompliancePairEntity } from '../entities/CompliancePairEntity.ts';
import { ComplianceReportEntity } from '../entities/ComplianceReportEntity.ts';
import { CvdEvalEntity } from '../entities/CvdEvalEntity.ts';
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
      const actual = report.selectedAlgorithm === 'apca'
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
      'warnings': []
    });
    const failurePolicy = CvdFailurePolicy.resolve(state.input.contrast);
    const diagnosticPairs = diagnostic.pairs.map((pair) => {
      const result = ContrastReportEntryEntity.intake(pair);
      return result;
    });
    const blockers = ComplianceSerialization.blockers(cvd.blocked, diagnosticPairs);
    const pairs = ComplianceSerialization.pairs(
      diagnosticPairs,
      cvd.warnings,
      cvd.corrections,
      failurePolicy,
      blockers
    );
    const problemPairs = pairs.filter((pair) => {
      const result = !pair.passed;
      return result;
    });
    const cvdCompliant = pairs.every((pair) => {
      const result = ComplianceSerialization.failureCount(pair.cvd) === 0;
      return result;
    });
    const result = ComplianceReportEntity.intake({
      'compliant': problemPairs.length === 0,
      'cvdCompliant': cvdCompliant,
      'pairs': pairs,
      'problemPairs': problemPairs,
      'selected': {
        'algorithm': diagnostic.selectedAlgorithm,
        'level': diagnostic.target
      }
    });
    return result;
  }

  private static blockers(
    blockedPairs: readonly CvdResultSetEntity.Type['blocked'][number][],
    diagnostics: readonly ContrastReportEntryEntity.Type[]
  ): ReadonlyMap<string, ReadonlySet<string>> {
    const keys = new Set<string>();
    for (let index = 0; index < diagnostics.length; index += 1) {
      const pair = diagnostics[index];
      if (pair !== undefined) {
        keys.add(ComplianceSerialization.key(pair.foreground, pair.background));
      }
    }
    const result = new Map<string, Set<string>>();
    for (let index = 0; index < blockedPairs.length; index += 1) {
      const blocked = blockedPairs[index];
      if (blocked === undefined) {
        continue;
      }
      const key = ComplianceSerialization.key(blocked.foreground, blocked.background);
      if (!keys.has(key)) {
        throw new TypeError('CVD blocked pair is absent from the selected contrast policy');
      }
      const causes = result.get(key) ?? new Set<string>();
      causes.add(blocked.reason === 'stated-both' ? 'pin' : 'solver-exhausted');
      result.set(key, causes);
    }
    return result;
  }

  private static pairs(
    diagnostics: readonly ContrastReportEntryEntity.Type[],
    warnings: readonly CvdPairWarningEntity.Type[],
    corrections: CvdResultSetEntity.Type['corrections'],
    failurePolicy: CvdFailurePolicy,
    blockers: ReadonlyMap<string, ReadonlySet<string>>
  ): readonly CompliancePairEntity.Type[] {
    const pairs: CompliancePairEntity.Type[] = [];
    for (let index = 0; index < diagnostics.length; index += 1) {
      const pair = diagnostics[index];
      if (pair === undefined) {
        continue;
      }
      pairs.push(ComplianceSerialization.pair(
        ContrastReportEntryEntity.intake(pair),
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
    blockers: ReadonlyMap<string, ReadonlySet<string>>
  ): CompliancePairEntity.Type {
    const cvd = ComplianceSerialization.outcomes(pair, warnings, failurePolicy);
    const cvdFailed = ComplianceSerialization.failureCount(cvd) > 0;
    const blockerCauses = blockers.get(ComplianceSerialization.key(pair.foreground, pair.background)) ?? new Set<string>();
    const passed = pair.passed && !cvdFailed && blockerCauses.size === 0;
    const causes = new Set<string>(pair.causes);
    if (cvdFailed) {
      causes.add('cvd');
    }
    for (const cause of blockerCauses) {
      causes.add(cause);
    }
    let disposition: CompliancePairEntity.Type['disposition'];
    if (pair.disposition === 'withheld') {
      disposition = 'withheld';
    } else if (passed) {
      disposition = 'resolved';
    } else {
      disposition = 'best-effort';
    }
    const result = CompliancePairEntity.intake({
      'actual': pair.actual,
      'adjustedRoles': ComplianceSerialization.adjustedRoles(pair, corrections),
      'background': pair.background,
      'causes': Array.from(causes),
      'cvd': cvd,
      'disposition': disposition,
      'foreground': pair.foreground,
      'passed': passed,
      'required': pair.required,
      'shortfall': pair.shortfall
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

  private static failureCount(outcomes: readonly CvdEvalEntity.Type[]): number {
    let failureCount = 0;
    for (let index = 0; index < outcomes.length; index += 1) {
      if (outcomes[index]?.fail === true) {
        failureCount += 1;
      }
    }
    return failureCount;
  }

  private static key(foreground: string, background: string): string {
    const result = foreground + String.fromCharCode(0) + background;
    return result;
  }

  private static outcomes(
    pair: ContrastReportEntryEntity.Type,
    warnings: readonly CvdPairWarningEntity.Type[],
    failurePolicy: CvdFailurePolicy
  ): CvdEvalEntity.Type[] {
    const outcomes: CvdEvalEntity.Type[] = [];
    for (let index = 0; index < warnings.length; index += 1) {
      const warning = warnings[index];
      if (warning?.foreground !== pair.foreground || warning?.background !== pair.background) {
        continue;
      }
      const evidence = CvdEvalEntity.intake({
        'belowFloor': warning.simulatedLuminanceContrast < warning.minimumSimulatedContrast,
        'cvdType': warning.cvdType,
        'drop': warning.drop,
        'exceedsDrop': Math.abs(warning.drop) > warning.dropThreshold,
        'fail': false,
        'originalContrast': warning.originalLuminanceContrast,
        'simContrast': warning.simulatedLuminanceContrast
      });
      outcomes.push(CvdEvalEntity.intake({
        ...evidence,
        'fail': failurePolicy.blocks(evidence)
      }));
    }
    return outcomes;
  }
}

/** Serializes the terminal compliance result without changing the resolved role colors. */
class ReportCompliance implements TaskInterface {
  readonly 'name' = 'report:compliance';

  readonly 'manifest' = TaskManifestEntity.create({
    'description': 'Serializes the completed terminal compliance result for rendered role colors without mutating roles.',
    'name': 'report:compliance',
    'reads': ['roles', "metadata['contrast:cvd']", "metadata['core:contrastReport']"],
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
