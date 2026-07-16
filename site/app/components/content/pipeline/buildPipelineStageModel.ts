import { cvdCorrectionSummary, pairSummary } from './pipelineStageSummaries.ts';

type PairReportType = {
  pairs: { pass: boolean }[];
};

type CvdReportType = {
  warnings: unknown[];
  corrections: { cvdTypesRemaining: string[] }[] | undefined;
};

export type PipelineStageModelType = {
  contrastSummary: string | undefined;
  cvdCorrectionText: string | undefined;
  cvdWarningCount: number | undefined;
  isCvdStage: boolean;
  isEnabled: boolean;
};

type ContrastReportSliceType = {
  aa?: PairReportType | undefined;
  aaa?: PairReportType | undefined;
  apca?: PairReportType | undefined;
  cvd?: CvdReportType | undefined;
};

export function buildPipelineStageModel(
  stageValue: string,
  enabledOptionalStages: ReadonlySet<string>,
  contrastReport: ContrastReportSliceType
): PipelineStageModelType {
  const isEnabled = enabledOptionalStages.has(stageValue);
  const isCvdStage = stageValue === 'enforce:cvdSimulate' && isEnabled;
  let contrastSummary: string | undefined;
  if (isEnabled) {
    if (stageValue === 'enforce:wcagAA' && contrastReport.aa !== undefined) {
      contrastSummary = pairSummary(contrastReport.aa);
    } else if (stageValue === 'enforce:wcagAAA' && contrastReport.aaa !== undefined) {
      contrastSummary = pairSummary(contrastReport.aaa);
    } else if (stageValue === 'enforce:apca' && contrastReport.apca !== undefined) {
      contrastSummary = pairSummary(contrastReport.apca);
    }
  }
  const cvdWarningCount = isCvdStage && contrastReport.cvd !== undefined ? contrastReport.cvd.warnings.length : undefined;
  const cvdCorrectionText = contrastReport.cvd === undefined ? undefined : cvdCorrectionSummary(contrastReport.cvd);
  return {
    contrastSummary,
    cvdCorrectionText,
    cvdWarningCount,
    isCvdStage,
    isEnabled
  };
}
