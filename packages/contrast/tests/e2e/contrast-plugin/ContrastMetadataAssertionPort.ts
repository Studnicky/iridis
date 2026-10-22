import type { PaletteStateInterface } from '@studnicky/iridis';

import { ComplianceReportInterfaceTypeEntity } from '../../../src/entities/ComplianceReportInterfaceTypeEntity.ts';
import { CvdResultSetInterfaceTypeEntity } from '../../../src/entities/CvdResultSetInterfaceTypeEntity.ts';

/** Validated metadata access for contrast scenario assertions. */
export class ContrastMetadataAssertionPort {
  static compliance(state: PaletteStateInterface): ComplianceReportInterfaceTypeEntity.Type | undefined {
    const value = state.metadata['contrast:complianceReport'];
    const result = value === undefined ? undefined : ComplianceReportInterfaceTypeEntity.intake(value);
    return result;
  }

  static cvd(state: PaletteStateInterface): CvdResultSetInterfaceTypeEntity.Type | undefined {
    const value = state.metadata['contrast:cvd'];
    const result = value === undefined ? undefined : CvdResultSetInterfaceTypeEntity.intake(value);
    return result;
  }
}
