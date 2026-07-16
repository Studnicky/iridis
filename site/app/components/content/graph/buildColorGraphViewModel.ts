import type { RoleMathEntryType } from '~/composables/types/roleMathEntry.ts';
import type { LegendItemType, LegendSectionType } from '~/components/content/viz/LegendMachine.ts';

export type ResolutionCategory = 'pinned' | 'synthesized' | 'derived' | 'direct';

export const DEFAULT_CATEGORY_VISIBILITY: Record<ResolutionCategory, boolean> = {
  direct: true,
  derived: true,
  synthesized: true,
  pinned: true
};

export const COLOR_GRAPH_MAX_INIT_ATTEMPTS = 10;
export const COLOR_GRAPH_ZOOM_STEP = 1.25;
export const COLOR_GRAPH_PAN_STEP = 80;
export const COLOR_GRAPH_SPACE_SIZE = 4096;
export const COLOR_GRAPH_FIT_PADDING = 0.15;
export const COLOR_GRAPH_FIT_DELAYS_MS = [0, 250, 500, 750, 1200] as const;
export const COLOR_GRAPH_CAPTURE_FIT_ZOOM_DELAY_MS = 1300;

export function categoryOfRole(role: RoleMathEntryType): ResolutionCategory {
  if (role.isPinned) return 'pinned';
  if (role.synthesized) return 'synthesized';
  if (role.isDerived) return 'derived';
  return 'direct';
}

/** Legend swatch colors are engine semantic role tokens, never decorative picks. */
export function buildColorGraphLegendTabs(
  roleCount: number,
  categoryVisible: Readonly<Record<ResolutionCategory, boolean>>
): readonly LegendSectionType[] {
  const entries: LegendItemType[] = [
    { key: 'direct', swatch: 'square', color: 'var(--ui-color-success-500)', label: 'Direct match', active: categoryVisible.direct },
    { key: 'derived', swatch: 'square', color: 'var(--ui-color-info-500)', label: 'Derived', active: categoryVisible.derived },
    { key: 'synthesized', swatch: 'dashed', color: 'var(--ui-color-warning-500)', label: 'Synthesized', active: categoryVisible.synthesized },
    { key: 'pinned', swatch: 'circle', color: 'var(--ui-primary)', label: 'Pinned', active: categoryVisible.pinned }
  ];
  return [{ key: 'resolution', label: `iridis-${roleCount}`, entries }];
}
