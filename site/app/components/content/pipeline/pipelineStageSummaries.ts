import type { ComplianceReportEntity, CvdResultSetEntity } from '@studnicky/iridis-contrast';

export const pipelineStageSummaries = class PipelineStageSummaries {
  public static buildPairSummary(report: ComplianceReportEntity.Type): string {
    const passing = report.pairs.length - report.problemPairs.length;
    return `${passing}/${report.pairs.length} pairs passing`;
  }

  public static buildCvdCorrectionSummary(report: CvdResultSetEntity.Type): string {
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
