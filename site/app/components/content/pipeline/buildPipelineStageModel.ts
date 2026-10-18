import type {
  ApcaPairResultSetInterfaceTypeEntity,
  CvdResultSetInterfaceTypeEntity,
  WcagPairResultSetInterfaceTypeEntity
} from '@studnicky/iridis-contrast';

import { pipelineStageSummaries } from './pipelineStageSummaries.ts';

class PipelineContrastReport {
  public readonly aa?: WcagPairResultSetInterfaceTypeEntity.Type;
  public readonly aaa?: WcagPairResultSetInterfaceTypeEntity.Type;
  public readonly apca?: ApcaPairResultSetInterfaceTypeEntity.Type;
  public readonly cvd?: CvdResultSetInterfaceTypeEntity.Type;
}

class PipelineStageModel {
  public readonly contrastSummary: string | undefined;
  public readonly cvdCorrectionText: string | undefined;
  public readonly cvdWarningCount: number | undefined;
  readonly #enabledOptionalStages: ReadonlySet<string>;
  readonly #stageValue: string;

  public constructor(
    stageValue: string,
    enabledOptionalStages: ReadonlySet<string>,
    details: Readonly<{
      'contrastSummary': string | undefined;
      'cvdCorrectionText': string | undefined;
      'cvdWarningCount': number | undefined;
    }>
  ) {
    this.contrastSummary = details.contrastSummary;
    this.cvdCorrectionText = details.cvdCorrectionText;
    this.cvdWarningCount = details.cvdWarningCount;
    this.#enabledOptionalStages = enabledOptionalStages;
    this.#stageValue = stageValue;
  }

  public get isEnabled(): boolean {
    const result = this.#enabledOptionalStages.has(this.#stageValue);
    return result;
  }

  public get isCvdStage(): boolean {
    const result = this.#stageValue === 'enforce:cvdSimulate' && this.isEnabled;
    return result;
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
    const result = new PipelineStageModel(stageValue, enabledOptionalStages, {
      'contrastSummary': contrastSummary,
      'cvdCorrectionText': cvdCorrectionText,
      'cvdWarningCount': cvdWarningCount
    });
    return result;
  }
};
