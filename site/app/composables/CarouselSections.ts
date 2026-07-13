/** The 12 carousel card definitions — single source of truth for CylinderCarousel, TableOfContentsBar, and the navigation target table (index into this array is the SELECT_CARD activeIndex). */
export const CAROUSEL_SECTIONS: ReadonlyArray<{ readonly key: string; readonly label: string }> = [
  { 'key': 'pipeline', 'label': 'Pipeline' },
  { 'key': 'rolesTable', 'label': 'Roles table' },
  { 'key': 'roles', 'label': 'Roles' },
  { 'key': 'cvd', 'label': 'CVD vision' },
  { 'key': 'components', 'label': 'Components' },
  { 'key': 'interactables', 'label': 'Interactables' },
  { 'key': 'spectrum', 'label': 'Spectrum' },
  { 'key': 'motion', 'label': 'Motion' },
  { 'key': 'colorStream', 'label': 'Color stream' },
  { 'key': 'hueDerivation', 'label': 'Hue derivation' },
  { 'key': 'schema', 'label': 'Schema tree' },
  { 'key': 'clamps', 'label': 'Clamps' },
];
