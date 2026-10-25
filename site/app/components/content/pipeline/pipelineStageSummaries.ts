import type { ComplianceReportEntity, CvdResultSetEntity } from '@studnicky/iridis-contrast';

export const pipelineStageSummaries = class PipelineStageSummaries {
  public static buildPairSummary(report: ComplianceReportEntity.Type): string {
    const passing = report.pairs.length - report.problemPairs.length;
    const relationIds = PipelineStageSummaries.relationIds(report);
    const relationSummary = relationIds.length === 0
      ? ''
      : `; relationship limits: ${relationIds.join(', ')}`;
    return `${passing}/${report.pairs.length} pairs passing${relationSummary}`;
  }

  private static relationIds(report: ComplianceReportEntity.Type): string[] {
    const relationIds = new Set<string>();
    for (let pairIndex = 0; pairIndex < report.problemPairs.length; pairIndex += 1) {
      const pair = report.problemPairs[pairIndex];
      if (pair === undefined) {
        continue;
      }
      const pairRelationIds = pair.relationIds ?? [];
      for (let relationIndex = 0; relationIndex < pairRelationIds.length; relationIndex += 1) {
        const relationId = pairRelationIds[relationIndex];
        if (relationId !== undefined) {
          relationIds.add(relationId);
        }
      }
    }
    const result = Array.from(relationIds);
    result.sort((left, right) => {
      const comparison = left.localeCompare(right);
      return comparison;
    });
    return result;
  }

  public static buildWithholdSummary(report: ComplianceReportEntity.Type): string {
    const result = report.disposition === 'withheld'
      ? `palette withheld: ${report.problemPairs.length} pairs below the standard`
      : 'palette released';
    return result;
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
