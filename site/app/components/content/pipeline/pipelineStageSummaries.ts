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
    for (let index = 0; index < report.pairs.length; index += 1) {
      const pair = report.pairs[index];
      if (pair?.pass === true) {
        passing++;
      }
    }
    return `${passing}/${report.pairs.length} pairs passing`;
  }

  public static buildCvdCorrectionSummary(report: CvdResultSetInterfaceTypeEntity.Type): string {
    let autoCorrected = 0;
    let stillFailing = 0;
    for (let index = 0; index < report.corrections.length; index += 1) {
      const correction = report.corrections[index];
      if (correction === undefined) {
        continue;
      }
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
