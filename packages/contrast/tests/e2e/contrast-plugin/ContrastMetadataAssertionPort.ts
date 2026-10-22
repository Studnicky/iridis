import type { PaletteStateInterface } from '@studnicky/iridis';

import { ComplianceReportEntity } from '../../../src/entities/ComplianceReportEntity.ts';
import { CvdResultSetEntity } from '../../../src/entities/CvdResultSetEntity.ts';

/** Validated metadata access for contrast scenario assertions. */
export class ContrastMetadataAssertionPort {
  static compliance(state: PaletteStateInterface): ComplianceReportEntity.Type | undefined {
    const value = state.metadata['contrast:complianceReport'];
    const result = value === undefined ? undefined : ComplianceReportEntity.intake(value);
    return result;
  }

  static cvd(state: PaletteStateInterface): CvdResultSetEntity.Type | undefined {
    const value = state.metadata['contrast:cvd'];
    const result = value === undefined ? undefined : CvdResultSetEntity.intake(value);
    return result;
  }
}
