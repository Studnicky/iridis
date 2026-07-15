/**
 * The stage-carousel definitions — single source of truth for the top-level
 * `<CylinderCarousel>` instances on the page (index.vue), the ToC bar, and the
 * navigation target table (useNavigationTargets.ts resolves a card id to its
 * owning stage + index within that stage's own local carousel state).
 *
 * Every stage is part of ONE continuous Upload→Combine→Refine→Explore→
 * Stylesheets→Reference tour — the same left-arrow/centered-title/right-arrow
 * header, and the same Next/Previous step navigation, applies uniformly
 * across the whole site (index.vue extends the sequence past Reference into
 * the docs list at the bottom). Combine only ever renders once an image has
 * been uploaded (see index.vue).
 */
export type CarouselCardType = { 'key': string; 'label': string };

export type StageGroupType = {
  'items': CarouselCardType[];
  'label': string;
  'name': string;
};

/**
 * Stable keys for every output format the engine has a real emit plugin for —
 * one Stylesheets-stage carousel card per format (see OutputFormatCard.vue /
 * useMultiOutput.ts), in the same fixed order the pipeline always emits them.
 */
export const OUTPUT_FORMAT_CARDS: readonly CarouselCardType[] = [
  { 'key': 'output-cssVars', 'label': 'CSS variables' },
  { 'key': 'output-cssVarsScoped', 'label': 'CSS variables (scoped)' },
  { 'key': 'output-tailwind', 'label': 'Tailwind' },
  { 'key': 'output-shadcn', 'label': 'shadcn/ui' },
  { 'key': 'output-mui', 'label': 'MUI' },
  { 'key': 'output-chakra', 'label': 'Chakra UI' },
  { 'key': 'output-panda', 'label': 'Panda CSS' },
  { 'key': 'output-unocss', 'label': 'UnoCSS' },
  { 'key': 'output-capacitor', 'label': 'Capacitor' },
  { 'key': 'output-androidThemeXml', 'label': 'Android theme.xml' },
  { 'key': 'output-json', 'label': 'JSON' },
  { 'key': 'output-rdf', 'label': 'RDF (Turtle)' },
  { 'key': 'output-vscode', 'label': 'VS Code theme' }
];

export const STAGE_GROUPS: readonly StageGroupType[] = [
  {
    'items': [
      { 'key': 'upload', 'label': 'Upload' }
    ],
    'label': 'Upload', 'name': 'upload'
  },
  {
    'items': [
      { 'key': 'combine', 'label': 'Combine' }
    ],
    'label': 'Combine', 'name': 'combine'
  },
  {
    'items': [
      { 'key': 'picker', 'label': 'Manual' },
      { 'key': 'palette', 'label': 'Palette' },
      { 'key': 'cvd', 'label': 'CVD vision' },
      { 'key': 'schemaCompliance', 'label': 'Schema & Compliance' },
      { 'key': 'derivationRelations', 'label': 'Derivation Relations' }
    ],
    'label': 'Refine', 'name': 'refine'
  },
  {
    'items': [
      { 'key': 'rolesTable', 'label': 'Roles table' },
      { 'key': 'roles', 'label': 'Roles' },
      { 'key': 'pairingPreview', 'label': 'Pairings' },
      { 'key': 'spectrum', 'label': 'Spectrum' },
      { 'key': 'colorGraph', 'label': 'Color graph' },
      { 'key': 'components', 'label': 'Components' },
      { 'key': 'interactables', 'label': 'Interactables' },
      { 'key': 'motion', 'label': 'Motion' },
      { 'key': 'colorStream', 'label': 'Color stream' }
    ],
    'label': 'Explore', 'name': 'explore'
  },
  {
    'items': [
      ...OUTPUT_FORMAT_CARDS
    ],
    'label': 'Stylesheets', 'name': 'result'
  },
  {
    'items': [
      { 'key': 'pipeline', 'label': 'Pipeline' },
      { 'key': 'schema', 'label': 'Schema tree' },
      { 'key': 'hueDerivation', 'label': 'Hue derivation' },
      { 'key': 'clamps', 'label': 'Clamps' }
    ],
    'label': 'Reference', 'name': 'reference'
  }
];

/** Every stage name in forward order, for the site-wide Next/Previous step navigation. */
export const SEQUENTIAL_STAGE_NAMES: readonly string[] = STAGE_GROUPS.map((group) => { const result = group.name; return result; });
