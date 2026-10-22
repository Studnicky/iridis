import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface
} from '@studnicky/iridis';

import {
  contrastApca,
  ContrastReportEntryInterfaceTypeEntity,
  contrastWcag21,
  Metadata,
  TaskManifestInterfaceTypeEntity
} from '@studnicky/iridis';

import type { CvdPairWarningInterfaceTypeEntity } from '../entities/CvdPairWarningInterfaceTypeEntity.ts';

import { CvdFailurePolicy } from '../CvdFailurePolicy.ts';
import { ComplianceBlockedPairInterfaceTypeEntity } from '../entities/ComplianceBlockedPairInterfaceTypeEntity.ts';
import { CompliancePairInterfaceTypeEntity } from '../entities/CompliancePairInterfaceTypeEntity.ts';
import { ComplianceReportInterfaceTypeEntity } from '../entities/ComplianceReportInterfaceTypeEntity.ts';
import { CvdEvalInterfaceTypeEntity } from '../entities/CvdEvalInterfaceTypeEntity.ts';
import { CvdResultSetInterfaceTypeEntity } from '../entities/CvdResultSetInterfaceTypeEntity.ts';

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
    pair: ContrastReportEntryInterfaceTypeEntity.Type,
    target: string
  ): ComplianceBlockedPairInterfaceTypeEntity.Type | undefined {
    if (pair.passed) {
      return undefined;
    }
    const result = ComplianceBlockedPairInterfaceTypeEntity.intake({
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
    pair: ContrastReportEntryInterfaceTypeEntity.Type,
    warnings: readonly CvdPairWarningInterfaceTypeEntity.Type[],
    failurePolicy: CvdFailurePolicy
  ): CompliancePairInterfaceTypeEntity.Type {
    const result = CompliancePairInterfaceTypeEntity.intake({
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

  static report(state: PaletteStateInterface): ComplianceReportInterfaceTypeEntity.Type | undefined {
    const diagnostic = Metadata.contrastReport(state.metadata);
    if (diagnostic === undefined) {
      return undefined;
    }
    const cvd = CvdResultSetInterfaceTypeEntity.intake(state.metadata['contrast:cvd'] ?? {
      'blocked': [],
      'corrections': [],
      'warnings': []
    });
    const failurePolicy = CvdFailurePolicy.resolve(state.input.contrast);
    const blockedPairs = new Map<string, ComplianceBlockedPairInterfaceTypeEntity.Type>();
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
    const result = ComplianceReportInterfaceTypeEntity.intake({
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
    warnings: readonly CvdPairWarningInterfaceTypeEntity.Type[],
    failurePolicy: CvdFailurePolicy,
    blockedPairs: Map<string, ComplianceBlockedPairInterfaceTypeEntity.Type>
  ): {
    readonly 'cvdFailureCount': number;
    readonly 'diagnostics': ReadonlyMap<string, ContrastReportEntryInterfaceTypeEntity.Type>;
    readonly 'pairs': readonly CompliancePairInterfaceTypeEntity.Type[];
  } {
    const diagnostics = new Map<string, ContrastReportEntryInterfaceTypeEntity.Type>();
    const pairs: CompliancePairInterfaceTypeEntity.Type[] = [];
    let cvdFailureCount = 0;
    for (let index = 0; index < diagnostic.pairs.length; index += 1) {
      const diagnosticPair = diagnostic.pairs[index];
      if (diagnosticPair === undefined) {
        continue;
      }
      const pair = ContrastReportEntryInterfaceTypeEntity.intake(diagnosticPair);
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
    cvdBlockedPairs: readonly (CvdResultSetInterfaceTypeEntity.Type['blocked'][number])[],
    diagnostics: ReadonlyMap<string, ContrastReportEntryInterfaceTypeEntity.Type>,
    target: string,
    blockedPairs: Map<string, ComplianceBlockedPairInterfaceTypeEntity.Type>
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
      blockedPairs.set(key, ComplianceBlockedPairInterfaceTypeEntity.intake({
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
    outcomes: readonly CvdEvalInterfaceTypeEntity.Type[]
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
    pair: ContrastReportEntryInterfaceTypeEntity.Type,
    warnings: readonly CvdPairWarningInterfaceTypeEntity.Type[],
    failurePolicy: CvdFailurePolicy
  ): CvdEvalInterfaceTypeEntity.Type[] {
    const outcomes: CvdEvalInterfaceTypeEntity.Type[] = [];
    for (let index = 0; index < warnings.length; index += 1) {
      const warning = warnings[index];
      if (warning?.foreground !== pair.foreground || warning?.background !== pair.background) {
        continue;
      }
      const evidence = CvdEvalInterfaceTypeEntity.intake({
        'belowFloor': warning.simulatedLuminanceContrast < warning.minimumSimulatedContrast,
        'cvdType': warning.cvdType,
        'drop': warning.drop,
        'exceedsDrop': Math.abs(warning.drop) > warning.dropThreshold,
        'fail': false,
        'originalContrast': warning.originalLuminanceContrast,
        'simContrast': warning.simulatedLuminanceContrast
      });
      const outcome = CvdEvalInterfaceTypeEntity.intake({
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

  readonly 'manifest' = TaskManifestInterfaceTypeEntity.create({
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
