import type { StageGroupType } from './types/stageGroup.ts';

import { OUTPUT_FORMAT_CARDS } from './outputFormatCards.ts';

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
      { 'key': 'picker', 'label': 'Palette' },
      { 'key': 'palette', 'label': 'Palette' },
      { 'key': 'cvd', 'label': 'CVD vision' },
      { 'key': 'schemaCompliance', 'label': 'Schema' },
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
