import type { ComplianceReportInterfaceTypeEntity, CvdResultSetInterfaceTypeEntity } from '@studnicky/iridis-contrast';

import { pipelineStageSummaries } from './pipelineStageSummaries.ts';

class PipelineContrastReport {
  public readonly compliance?: ComplianceReportInterfaceTypeEntity.Type;
  public readonly cvd?: CvdResultSetInterfaceTypeEntity.Type;
}

class PipelineStageModel {
  public readonly contrastSummary: string | undefined;
  public readonly cvdCorrectionText: string | undefined;
  public readonly cvdWarningCount: number | undefined;

  public constructor(
    details: Readonly<{
      'contrastSummary': string | undefined;
      'cvdCorrectionText': string | undefined;
      'cvdWarningCount': number | undefined;
    }>
  ) {
    this.contrastSummary = details.contrastSummary;
    this.cvdCorrectionText = details.cvdCorrectionText;
    this.cvdWarningCount = details.cvdWarningCount;
  }
}

export const buildPipelineStageModel = class PipelineStageModelBuilder {
  public static build(
    stageValue: string,
    contrastReport: PipelineContrastReport
  ): PipelineStageModel {
    const isComplianceReport = stageValue === 'report:compliance';
    const isCvdStage = stageValue === 'enforce:compliance';
    const contrastSummary = isComplianceReport && contrastReport.compliance !== undefined
      ? pipelineStageSummaries.buildPairSummary(contrastReport.compliance)
      : undefined;
    const cvdWarningCount = isCvdStage && contrastReport.cvd !== undefined
      ? contrastReport.cvd.warnings.length
      : undefined;
    const cvdCorrectionText = isCvdStage && contrastReport.cvd !== undefined
      ? pipelineStageSummaries.buildCvdCorrectionSummary(contrastReport.cvd)
      : undefined;
    const result = new PipelineStageModel({
      'contrastSummary': contrastSummary,
      'cvdCorrectionText': cvdCorrectionText,
      'cvdWarningCount': cvdWarningCount
    });
    return result;
  }
};
