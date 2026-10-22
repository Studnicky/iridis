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
import { ComplianceBlockedPairEntity } from '../entities/ComplianceBlockedPairEntity.ts';
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
  static blockedPair(
    pair: ContrastReportEntryEntity.Type,
    target: string
  ): ComplianceBlockedPairEntity.Type | undefined {
    if (pair.passed) {
      return undefined;
    }
    const result = ComplianceBlockedPairEntity.intake({
      'actualTrichromat': pair.actual,
      'background': pair.background,
      'foreground': pair.foreground,
      'reason': pair.disposition === 'blocked-stated' ? 'stated-both' : 'solver-exhausted',
      'requiredTrichromat': pair.required,
      'target': target
    });
    return result;
  }

  static pair(
    pair: ContrastReportEntryEntity.Type,
    warnings: readonly CvdPairWarningEntity.Type[],
    failurePolicy: CvdFailurePolicy
  ): CompliancePairEntity.Type {
    const result = CompliancePairEntity.intake({
      'actualTrichromat': pair.actual,
      ...(pair.adjustedRole === undefined ? {} : { 'adjustedRole': pair.adjustedRole }),
      'background': pair.background,
      'cvd': ComplianceSerialization.outcomes(pair, warnings, failurePolicy),
      'disposition': pair.disposition,
      'foreground': pair.foreground,
      'passed': pair.passed,
      'requiredTrichromat': pair.required
    });
    return result;
  }

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
    const blockedPairs = new Map<string, ComplianceBlockedPairEntity.Type>();
    const serialization = ComplianceSerialization.pairs(
      diagnostic,
      cvd.warnings,
      failurePolicy,
      blockedPairs
    );
    ComplianceSerialization.applyCvdBlockers(
      cvd.blocked,
      serialization.diagnostics,
      diagnostic.target,
      blockedPairs
    );
    const cvdCompliant = serialization.cvdFailureCount === 0;
    const compliant = diagnostic.compliant && cvdCompliant && blockedPairs.size === 0;
    if (!compliant && blockedPairs.size === 0) {
      throw new TypeError('Terminal compliance failure has no blocked pair');
    }
    const result = ComplianceReportEntity.intake({
      'blockedPairs': Array.from(blockedPairs.values()),
      'compliant': compliant,
      'cvdCompliant': cvdCompliant,
      'pairs': serialization.pairs,
      'selected': {
        'algorithm': diagnostic.selectedAlgorithm,
        'level': diagnostic.target
      }
    });
    return result;
  }

  private static pairs(
    diagnostic: NonNullable<ReturnType<typeof Metadata.contrastReport>>,
    warnings: readonly CvdPairWarningEntity.Type[],
    failurePolicy: CvdFailurePolicy,
    blockedPairs: Map<string, ComplianceBlockedPairEntity.Type>
  ): {
    readonly 'cvdFailureCount': number;
    readonly 'diagnostics': ReadonlyMap<string, ContrastReportEntryEntity.Type>;
    readonly 'pairs': readonly CompliancePairEntity.Type[];
  } {
    const diagnostics = new Map<string, ContrastReportEntryEntity.Type>();
    const pairs: CompliancePairEntity.Type[] = [];
    let cvdFailureCount = 0;
    for (let index = 0; index < diagnostic.pairs.length; index += 1) {
      const diagnosticPair = diagnostic.pairs[index];
      if (diagnosticPair === undefined) {
        continue;
      }
      const pair = ContrastReportEntryEntity.intake(diagnosticPair);
      const key = ComplianceSerialization.key(pair.foreground, pair.background);
      diagnostics.set(key, pair);
      const serialized = ComplianceSerialization.pair(pair, warnings, failurePolicy);
      pairs.push(serialized);
      cvdFailureCount += ComplianceSerialization.failureCount(serialized.cvd);
      const blocked = ComplianceSerialization.blockedPair(pair, diagnostic.target);
      if (blocked !== undefined) {
        blockedPairs.set(key, blocked);
      }
    }
    const result = { 'cvdFailureCount': cvdFailureCount, 'diagnostics': diagnostics, 'pairs': pairs };
    return result;
  }

  private static applyCvdBlockers(
    cvdBlockedPairs: readonly (CvdResultSetEntity.Type['blocked'][number])[],
    diagnostics: ReadonlyMap<string, ContrastReportEntryEntity.Type>,
    target: string,
    blockedPairs: Map<string, ComplianceBlockedPairEntity.Type>
  ): void {
    for (let index = 0; index < cvdBlockedPairs.length; index += 1) {
      const blocked = cvdBlockedPairs[index];
      if (blocked === undefined) {
        continue;
      }
      const key = ComplianceSerialization.key(blocked.foreground, blocked.background);
      const pair = diagnostics.get(key);
      if (pair === undefined) {
        throw new TypeError('CVD blocked pair is absent from the selected contrast policy');
      }
      blockedPairs.set(key, ComplianceBlockedPairEntity.intake({
        'actualTrichromat': pair.actual,
        'background': pair.background,
        'foreground': pair.foreground,
        'reason': blocked.reason,
        'requiredTrichromat': pair.required,
        'target': target
      }));
    }
  }

  private static failureCount(
    outcomes: readonly CvdEvalEntity.Type[]
  ): number {
    let failureCount = 0;
    for (let index = 0; index < outcomes.length; index += 1) {
      if (outcomes[index]?.fail === true) {
        failureCount += 1;
      }
    }
    return failureCount;
  }

  private static key(foreground: string, background: string): string {
    const result = `${foreground}\u0000${background}`;
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
      const outcome = CvdEvalEntity.intake({
        ...evidence,
        'fail': failurePolicy.blocks(evidence)
      });
      outcomes.push(outcome);
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
