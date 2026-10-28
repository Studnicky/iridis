import type { ContrastFeasibilityReportEntity } from '@studnicky/iridis-contrast';

import type { PaletteSnapshotEntity } from '../../entities/PaletteSnapshotEntity.ts';
import type { PaletteSessionInputEntity } from '../entities/PaletteSessionInputEntity.ts';

/** Receives the resolution outcomes the runtime settles; only the current revision's outcome arrives. */
export interface PaletteSessionOutcomeInterface {
  'failed': (revision: number, correlationId: string, message: string) => void;
  'feasibilityChecking': () => void;
  'feasibilityFailed': (message: string) => void;
  'feasibilityReported': (report: ContrastFeasibilityReportEntity.Type) => void;
  'published': (
    revision: number,
    correlationId: string,
    input: PaletteSessionInputEntity.Type,
    snapshot: PaletteSnapshotEntity.Type
  ) => void;
}
