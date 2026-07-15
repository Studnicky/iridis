import { COLOR_PIPELINE } from './colorPipeline.ts';
import { OPTIONAL_STAGE_NAMES } from './optionalStageNames.ts';

/**
 * The required (non-toggleable) color stages: COLOR_PIPELINE minus every
 * optional contrast-standard check — enforce:cvdSimulate is always on, not
 * user-toggleable, unlike enforce:wcagAA/AAA/apca. Shared by useIridis's live
 * pipeline and useMultiOutput's export pipeline so neither can drift out of
 * sync with COLOR_PIPELINE's own stage list.
 */
export const REQUIRED_COLOR_STAGES = COLOR_PIPELINE.filter((stage) => {return !OPTIONAL_STAGE_NAMES.includes(stage);});
