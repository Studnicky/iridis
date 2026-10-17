import type {
  ApcaPairResultSetInterfaceTypeEntity,
  CvdResultSetInterfaceTypeEntity,
  WcagPairResultSetInterfaceTypeEntity
} from '@studnicky/iridis-contrast';

export const pipelineStageSummaries = class PipelineStageSummaries {
  public static buildPairSummary(
    report: ApcaPairResultSetInterfaceTypeEntity.Type | WcagPairResultSetInterfaceTypeEntity.Type
  ): string {
    let passing = 0;
    for (const pair of report.pairs) {
      if (pair.pass) {
        passing++;
      }
    }
    return `${passing}/${report.pairs.length} pairs passing`;
  }

  public static buildCvdCorrectionSummary(report: CvdResultSetInterfaceTypeEntity.Type): string {
    let autoCorrected = 0;
    let stillFailing = 0;
    for (const correction of report.corrections) {
      const hasRemainingCvdType = correction.cvdTypesRemaining.some(() => {
        return true;
      });
      if (!hasRemainingCvdType) {
        autoCorrected++;
      } else {
        stillFailing++;
      }
    }
    return `${autoCorrected} pairs auto-corrected, ${stillFailing} still failing`;
  }
};
