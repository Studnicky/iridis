import type {
  ApcaPairResultSetInterfaceType,
  CvdResultSetInterfaceType,
  WcagPairResultSetInterfaceType
} from '@studnicky/iridis-contrast';

import { pipelineStageSummaries } from './pipelineStageSummaries.ts';

class PipelineContrastReport {
  public readonly aa?: WcagPairResultSetInterfaceType;
  public readonly aaa?: WcagPairResultSetInterfaceType;
  public readonly apca?: ApcaPairResultSetInterfaceType;
  public readonly cvd?: CvdResultSetInterfaceType;
}

class PipelineStageModel {
  public readonly contrastSummary: string | undefined;
  public readonly cvdCorrectionText: string | undefined;
  public readonly cvdWarningCount: number | undefined;
  public readonly isCvdStage: boolean;
  public readonly isEnabled: boolean;

  public constructor(
    contrastSummary: string | undefined,
    cvdCorrectionText: string | undefined,
    cvdWarningCount: number | undefined,
    isCvdStage: boolean,
    isEnabled: boolean
  ) {
    this.contrastSummary = contrastSummary;
    this.cvdCorrectionText = cvdCorrectionText;
    this.cvdWarningCount = cvdWarningCount;
    this.isCvdStage = isCvdStage;
    this.isEnabled = isEnabled;
  }
}

export const buildPipelineStageModel = class PipelineStageModelBuilder {
  public static build(
    stageValue: string,
    enabledOptionalStages: ReadonlySet<string>,
    contrastReport: PipelineContrastReport
  ): PipelineStageModel {
    const isEnabled = enabledOptionalStages.has(stageValue);
    const isCvdStage = stageValue === 'enforce:cvdSimulate' && isEnabled;
    let contrastSummary: string | undefined;
    if (isEnabled) {
      if (stageValue === 'enforce:wcagAA' && contrastReport.aa !== undefined) {
        contrastSummary = pipelineStageSummaries.buildPairSummary(contrastReport.aa);
      } else if (stageValue === 'enforce:wcagAAA' && contrastReport.aaa !== undefined) {
        contrastSummary = pipelineStageSummaries.buildPairSummary(contrastReport.aaa);
      } else if (stageValue === 'enforce:apca' && contrastReport.apca !== undefined) {
        contrastSummary = pipelineStageSummaries.buildPairSummary(contrastReport.apca);
      }
    }
    const cvdWarningCount = isCvdStage && contrastReport.cvd !== undefined
      ? contrastReport.cvd.warnings.length
      : undefined;
    const cvdCorrectionText = contrastReport.cvd === undefined
      ? undefined
      : pipelineStageSummaries.buildCvdCorrectionSummary(contrastReport.cvd);
    return new PipelineStageModel(
      contrastSummary,
      cvdCorrectionText,
      cvdWarningCount,
      isCvdStage,
      isEnabled
    );
  }
};
