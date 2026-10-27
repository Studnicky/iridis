/** The stage order the site runs; the selected contrast standard is `input.contrast`, never a stage. */
export const COLOR_PIPELINE = [
  'intake:hexHint', 'resolve:roles', 'derive:roleRelations', 'enforce:compliance', 'derive:variant',
  'report:compliance', 'withhold:compliance'
];
