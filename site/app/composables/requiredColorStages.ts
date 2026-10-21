import { COLOR_PIPELINE } from './colorPipeline.ts';
import { OPTIONAL_STAGE_NAMES } from './optionalStageNames.ts';

/**
 * The non-toggleable stages in the canonical color pipeline. useIridis and
 * useMultiOutput compose these with selected contrast stages; CVD simulation
 * remains required.
 */
const OPTIONAL_STAGE_NAME_SET = new Set(OPTIONAL_STAGE_NAMES);

export const REQUIRED_COLOR_STAGES = COLOR_PIPELINE.filter((stage) => {
  const result = !OPTIONAL_STAGE_NAME_SET.has(stage);
  return result;
});
