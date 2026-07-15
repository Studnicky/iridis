/**
 * Exported so PipelineExplainer.vue can walk the same stage order and pull each
 * task's own manifest. pin:derivedRoles runs between resolve:roles and
 * expand:family — see PinDerivedRoles.ts for why that ordering is load-bearing.
 * This is the full superset of stages (required + every optional check) for
 * documentation purposes; the actual per-run pipeline is built by
 * pipelineBuild() in useIridis.ts from REQUIRED_*_STAGES plus whichever
 * OPTIONAL_STAGE_NAMES are currently enabled.
 */
export const COLOR_PIPELINE = [
  'intake:hexHint', 'derive:semanticHues', 'resolve:roles', 'pin:derivedRoles', 'derive:roleRelations', 'expand:family',
  'enforce:contrast', 'enforce:wcagAA', 'enforce:wcagAAA', 'enforce:apca', 'enforce:cvdSimulate',
  'derive:variant'
];
