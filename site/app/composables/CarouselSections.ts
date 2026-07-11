/** The 10 carousel card definitions — single source of truth for CylinderCarousel, TableOfContentsBar, and the navigation target table (index into this array is the SELECT_CARD activeIndex). */
export const CAROUSEL_SECTIONS: ReadonlyArray<{ readonly key: string; readonly label: string }> = [
  { 'key': 'pipeline', 'label': 'Pipeline' },
  { 'key': 'rolesTable', 'label': 'Roles table' },
  { 'key': 'cvd', 'label': 'CVD vision' },
  { 'key': 'roles', 'label': 'Roles' },
  { 'key': 'components', 'label': 'Components' },
  { 'key': 'spectrum', 'label': 'Spectrum' },
  { 'key': 'motion', 'label': 'Motion' },
  { 'key': 'spaces', 'label': 'Spaces' },
  { 'key': 'schema', 'label': 'Schema' },
  { 'key': 'clamps', 'label': 'Clamps' },
];
