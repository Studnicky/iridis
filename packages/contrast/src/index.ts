import './types/augmentation.ts';

export { ContrastPlugin, contrastPlugin }         from './ContrastPlugin.ts';
export { EnforceWcagAa, enforceWcagAa }            from './tasks/EnforceWcagAa.ts';
export { EnforceWcagAaa, enforceWcagAaa }          from './tasks/EnforceWcagAaa.ts';
export { EnforceApca, enforceApca }                from './tasks/EnforceApca.ts';
export { EnforceCvdSimulate, enforceCvdSimulate }  from './tasks/EnforceCvdSimulate.ts';
export { cvdMatrices, protanopiaMatrix, deuteranopiaMatrix, tritanopiaMatrix, achromatopsiaMatrix } from './data/cvdMatrices.ts';
export { CVD_THRESHOLDS }                                from './data/cvdThresholds.ts';
export type { CvdThresholdInterface }                    from './data/cvdThresholds.ts';
export type { CvdMatrixInterface }                       from './types/index.ts';
