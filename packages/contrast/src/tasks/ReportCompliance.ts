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
    warnings: readonly CvdPairWarningInterfaceTypeEntity.Type[]
  ): CompliancePairInterfaceTypeEntity.Type {
    const result = CompliancePairInterfaceTypeEntity.intake({
      'actualTrichromat': pair.actual,
      ...(pair.adjustedRole === undefined ? {} : { 'adjustedRole': pair.adjustedRole }),
      'background': pair.background,
      'cvd': ComplianceSerialization.outcomes(pair, warnings),
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
    const pairs: CompliancePairInterfaceTypeEntity.Type[] = [];
    const diagnostics = new Map<string, ContrastReportEntryInterfaceTypeEntity.Type>();
    const blockedPairs = new Map<string, ComplianceBlockedPairInterfaceTypeEntity.Type>();
    for (let index = 0; index < diagnostic.pairs.length; index += 1) {
      const diagnosticPair = diagnostic.pairs[index];
      if (diagnosticPair === undefined) {
        continue;
      }
      const pair = ContrastReportEntryInterfaceTypeEntity.intake(diagnosticPair);
      const key = ComplianceSerialization.key(pair.foreground, pair.background);
      diagnostics.set(key, pair);
      pairs.push(ComplianceSerialization.pair(pair, cvd.warnings));
      const blocked = ComplianceSerialization.blockedPair(pair, diagnostic.target);
      if (blocked !== undefined) {
        blockedPairs.set(key, blocked);
      }
    }
    for (let index = 0; index < cvd.blocked.length; index += 1) {
      const blocked = cvd.blocked[index];
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
        'target': diagnostic.target
      }));
    }
    const cvdCompliant = cvd.warnings.length === 0;
    const compliant = diagnostic.compliant && cvdCompliant && blockedPairs.size === 0;
    if (!compliant && blockedPairs.size === 0) {
      throw new TypeError('Terminal compliance failure has no blocked pair');
    }
    const result = ComplianceReportInterfaceTypeEntity.intake({
      'blockedPairs': Array.from(blockedPairs.values()),
      'compliant': compliant,
      'cvdCompliant': cvdCompliant,
      'pairs': pairs,
      'selected': {
        'algorithm': diagnostic.selectedAlgorithm,
        'level': diagnostic.target
      }
    });
    return result;
  }

  private static key(foreground: string, background: string): string {
    const result = `${foreground}\u0000${background}`;
    return result;
  }

  private static outcomes(
    pair: ContrastReportEntryInterfaceTypeEntity.Type,
    warnings: readonly CvdPairWarningInterfaceTypeEntity.Type[]
  ): CvdEvalInterfaceTypeEntity.Type[] {
    const outcomes: CvdEvalInterfaceTypeEntity.Type[] = [];
    for (let index = 0; index < warnings.length; index += 1) {
      const warning = warnings[index];
      if (warning?.foreground !== pair.foreground || warning?.background !== pair.background) {
        continue;
      }
      outcomes.push(CvdEvalInterfaceTypeEntity.intake({
        'belowFloor': warning.simulatedLuminanceContrast < warning.minimumSimulatedContrast,
        'cvdType': warning.cvdType,
        'drop': warning.drop,
        'exceedsDrop': Math.abs(warning.drop) > warning.dropThreshold,
        'fail': true,
        'originalContrast': warning.originalLuminanceContrast,
        'simContrast': warning.simulatedLuminanceContrast
      }));
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
