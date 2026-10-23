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

  static clear<Value>(target: Record<string, Value>): void {
    const names = Object.keys(target);
    for (let index = 0; index < names.length; index += 1) {
      const name = names[index];
      if (name !== undefined && !Reflect.deleteProperty(target, name)) {
        throw new TypeError('Unable to withhold resolved palette data');
      }
    }
  }

  static report(report: ComplianceReportEntity.Type): ComplianceReportEntity.Type {
    const result = ComplianceReportEntity.create({
      ...report,
      'disposition': 'withheld'
    });
    return result;
  }
}

/** Withholds unresolved strict-compliance palette roles after terminal evidence is recorded. */
class WithholdCompliance implements TaskInterface {
  readonly 'name' = 'withhold:compliance';

  readonly 'manifest' = TaskManifestEntity.create({
    'description': 'Withholds unresolved strict-compliance roles and variants after preserving terminal compliance evidence.',
    'name': 'withhold:compliance',
    'reads': ['roles', 'variants', 'input.contrast', "metadata['contrast:complianceReport']"],
    'writes': ['roles', 'variants', "metadata['contrast:complianceReport']"]
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
    ComplianceWithholding.clear(state.roles);
    ComplianceWithholding.clear(state.variants);
  }
}

export const withholdCompliance = new WithholdCompliance();
