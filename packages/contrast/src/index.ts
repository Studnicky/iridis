import './types/augmentation.ts';
import { ContrastPlugin } from './ContrastPlugin.ts';

export { ContrastPlugin } from './ContrastPlugin.ts';
export const contrastPlugin = new ContrastPlugin();
export { cvdMatrices }        from './data/cvdMatrices.ts';
export { CVD_THRESHOLDS }     from './data/cvdThresholds.ts';
export { enforceApca }        from './tasks/EnforceApca.ts';
export { enforceCvdSimulate } from './tasks/EnforceCvdSimulate.ts';
export { enforceWcagAa }      from './tasks/EnforceWcagAa.ts';
export { enforceWcagAaa }     from './tasks/EnforceWcagAaa.ts';
export type { CvdMatrixInterfaceType } from './types/index.ts';
