import type {
  ApcaPairResultSetInterfaceType,
  CvdResultSetInterfaceType,
  WcagPairResultSetInterfaceType
} from '@studnicky/iridis-contrast';

export const pipelineStageSummaries = class PipelineStageSummaries {
  public static buildPairSummary(
    report: ApcaPairResultSetInterfaceType | WcagPairResultSetInterfaceType
  ): string {
    let passing = 0;
    for (const pair of report.pairs) {
      if (pair.pass) {
        passing++;
      }
    }
    return `${passing}/${report.pairs.length} pairs passing`;
  }

  public static buildCvdCorrectionSummary(report: CvdResultSetInterfaceType): string | undefined {
    if (report.corrections === undefined) {
      return undefined;
    }
    let autoCorrected = 0;
    let stillFailing = 0;
    for (const correction of report.corrections) {
      if (correction.cvdTypesRemaining.length === 0) {
        autoCorrected++;
      } else {
        stillFailing++;
      }
    }
    return `${autoCorrected} pairs auto-corrected, ${stillFailing} still failing`;
  }
};
