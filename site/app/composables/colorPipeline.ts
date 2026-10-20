/**
 * The complete stage order used by PipelineExplainer and the PaletteSession
 * resolution adapter. The adapter selects required and admitted optional stages
 * from this list while preserving the placement of derived-role pinning.
 */
export const COLOR_PIPELINE = [
  'intake:hexHint', 'derive:semanticHues', 'resolve:roles', 'pin:derivedRoles', 'derive:roleRelations', 'expand:family',
  'enforce:contrast', 'enforce:wcagAA', 'enforce:wcagAAA', 'enforce:apca', 'enforce:cvdSimulate',
  'derive:variant'
];
