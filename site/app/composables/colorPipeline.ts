/** The stage order the site runs; the selected contrast standard is `input.contrast`, never a stage. */
export const COLOR_PIPELINE = [
  'intake:hexHint', 'derive:semanticHues', 'resolve:roles', 'pin:derivedRoles', 'derive:roleRelations', 'expand:family',
  'enforce:compliance', 'derive:variant', 'report:compliance'
];
