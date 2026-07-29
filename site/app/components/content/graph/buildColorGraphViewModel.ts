import type { RoleMathEntryType } from '~/composables/types/roleMathEntry.ts';

class ColorGraphCategoryVisibility {
  public derived: boolean;
  public direct: boolean;
  public pinned: boolean;
  public synthesized: boolean;

  public constructor(derived: boolean, direct: boolean, pinned: boolean, synthesized: boolean) {
    this.derived = derived;
    this.direct = direct;
    this.pinned = pinned;
    this.synthesized = synthesized;
  }
}

class ColorGraphLegendItem {
  public readonly active: boolean;
  public readonly color: string;
  public readonly key: string;
  public readonly label: string;
  public readonly swatch: 'solid' | 'dashed' | 'square' | 'circle';

  public constructor(
    active: boolean,
    color: string,
    key: string,
    label: string,
    swatch: 'solid' | 'dashed' | 'square' | 'circle'
  ) {
    this.active = active;
    this.color = color;
    this.key = key;
    this.label = label;
    this.swatch = swatch;
  }
}

class ColorGraphLegendSection {
  public readonly entries: readonly ColorGraphLegendItem[];
  public readonly key: string;
  public readonly label: string;

  public constructor(entries: readonly ColorGraphLegendItem[], key: string, label: string) {
    this.entries = entries;
    this.key = key;
    this.label = label;
  }
}

export const buildColorGraphViewModel = class ColorGraphViewModelBuilder {
  public static readonly captureFitZoomDelayMs = 1300;
  public static readonly fitDelaysMs: readonly number[] = [0, 250, 500, 750, 1200];
  public static readonly fitPadding = 0.15;
  public static readonly maximumInitAttempts = 10;
  public static readonly panStep = 80;
  public static readonly spaceSize = 4096;
  public static readonly zoomStep = 1.25;

  public static buildLegendTabs(
    roleCount: number,
    categoryVisible: ColorGraphCategoryVisibility
  ): readonly ColorGraphLegendSection[] {
    const entries = [
      new ColorGraphLegendItem(
        categoryVisible.direct,
        'var(--ui-color-success-500)',
        'direct',
        'Direct match',
        'square'
      ),
      new ColorGraphLegendItem(
        categoryVisible.derived,
        'var(--ui-color-info-500)',
        'derived',
        'Derived',
        'square'
      ),
      new ColorGraphLegendItem(
        categoryVisible.synthesized,
        'var(--ui-color-warning-500)',
        'synthesized',
        'Synthesized',
        'dashed'
      ),
      new ColorGraphLegendItem(
        categoryVisible.pinned,
        'var(--ui-primary)',
        'pinned',
        'Pinned',
        'circle'
      )
    ];
    return [new ColorGraphLegendSection(entries, 'resolution', `iridis-${roleCount}`)];
  }

  public static categoryOfRole(
    role: RoleMathEntryType
  ): 'pinned' | 'synthesized' | 'derived' | 'direct' {
    if (role.isPinned) {return 'pinned';}
    if (role.synthesized) {return 'synthesized';}
    if (role.isDerived) {return 'derived';}
    return 'direct';
  }

  public static createCategoryVisibility(): ColorGraphCategoryVisibility {
    return new ColorGraphCategoryVisibility(true, true, true, true);
  }

  public static toggleCategoryVisibility(
    categoryVisible: ColorGraphCategoryVisibility,
    key: string
  ): void {
    if (key === 'derived') {
      categoryVisible.derived = !categoryVisible.derived;
    } else if (key === 'direct') {
      categoryVisible.direct = !categoryVisible.direct;
    } else if (key === 'pinned') {
      categoryVisible.pinned = !categoryVisible.pinned;
    } else if (key === 'synthesized') {
      categoryVisible.synthesized = !categoryVisible.synthesized;
    }
  }
};
