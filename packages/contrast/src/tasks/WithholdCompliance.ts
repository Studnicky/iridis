import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface
} from '@studnicky/iridis';

import { TaskManifestEntity } from '@studnicky/iridis';

import { ComplianceReportEntity } from '../entities/ComplianceReportEntity.ts';

class ComplianceWithholding {
  static applies(state: PaletteStateInterface, report: ComplianceReportEntity.Type): boolean {
    const result =
      state.input.contrast?.enableStrictCompliance === true &&
      report.problemPairs.length > 0 &&
      report.disposition !== 'withheld';
    return result;
  }

  static report(report: ComplianceReportEntity.Type): ComplianceReportEntity.Type {
    const result = ComplianceReportEntity.create({
      ...report,
      'disposition': 'withheld'
    });
    return result;
  }
}

/** Marks unresolved strict-compliance output as withheld after recording terminal evidence. */
class WithholdCompliance implements TaskInterface {
  readonly 'name' = 'withhold:compliance';

  readonly 'manifest' = TaskManifestEntity.create({
    'description': 'Marks unresolved strict-compliance output as withheld while preserving the best-achievable roles and variants.',
    'name': 'withhold:compliance',
    'reads': ['input.contrast', "metadata['contrast:complianceReport']"],
    'writes': ["metadata['contrast:complianceReport']"]
  });

  run(state: PaletteStateInterface, _context: PipelineContextInterface): void {
    const rawReport = state.metadata['contrast:complianceReport'];
    if (rawReport === undefined) {
      return;
    }
    const report = ComplianceReportEntity.intake(rawReport);
    if (!ComplianceWithholding.applies(state, report)) {
      return;
    }
    state.metadata['contrast:complianceReport'] = ComplianceWithholding.report(report);
  }
}

export const withholdCompliance = new WithholdCompliance();
