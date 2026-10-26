import { ColorGraphCategoryVisibility } from './ColorGraphCategoryVisibility.ts';
import { ColorGraphNodeCategory } from './ColorGraphNodeCategory.ts';

class ColorGraphLegendItem {
  public readonly category: ColorGraphNodeCategory;

  public readonly color: string;

  public readonly label: string;

  public readonly markClass: string;

  private readonly categoryVisibility: ColorGraphCategoryVisibility;

  public constructor(
    category: ColorGraphNodeCategory,
    categoryVisibility: ColorGraphCategoryVisibility,
    color: string,
    label: string,
    markClass: string
  ) {
    this.category = category;
    this.categoryVisibility = categoryVisibility;
    this.color = color;
    this.label = label;
    this.markClass = markClass;
  }

  public get active(): boolean {
    const visible = this.categoryVisibility.isVisible(this.category);

    return visible;
  }

  public get key(): string {
    const identifier = this.category.identifier;

    return identifier;
  }

  public get swatch(): 'circle' | 'dashed' | 'solid' | 'square' {
    if (this.markClass === 'circle') {
      return 'circle';
    }
    if (this.markClass === 'dashed') {
      return 'dashed';
    }
    if (this.markClass === 'square') {
      return 'square';
    }

    return 'solid';
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
  public static readonly fitDelaysMs: readonly number[] = [
    0,
    250,
    500,
    750,
    1200
  ];

  public static readonly fitPadding = 0.15;


  /** Input-free time after which a settled graph is disposed behind its snapshot. */
  public static readonly idleSuspendMs = 3000;

  public static readonly panStep = 80;

  public static readonly spaceSize = 4096;

  public static readonly zoomStep = 1.25;

  public static buildLegendTabs(
    roleCount: number,
    categoryVisible: ColorGraphCategoryVisibility
  ): readonly ColorGraphLegendSection[] {
    const direct = ColorGraphNodeCategory.Direct;
    const derived = ColorGraphNodeCategory.Derived;
    const synthesized = ColorGraphNodeCategory.Synthesized;
    const pinned = ColorGraphNodeCategory.Pinned;
    const entries = [
      new ColorGraphLegendItem(
        direct,
        categoryVisible,
        'var(--ui-color-success-500)',
        'Direct match',
        'solid'
      ),
      new ColorGraphLegendItem(
        derived,
        categoryVisible,
        'var(--ui-color-info-500)',
        'Derived',
        'solid'
      ),
      new ColorGraphLegendItem(
        synthesized,
        categoryVisible,
        'var(--ui-color-warning-500)',
        'Synthesized',
        'dashed'
      ),
      new ColorGraphLegendItem(
        pinned,
        categoryVisible,
        'var(--ui-primary)',
        'Pinned',
        'circle'
      )
    ];
    const sections = [new ColorGraphLegendSection(entries, 'resolution', `iridis-${roleCount}`)];

    return sections;
  }

  public static createCategoryVisibility(): ColorGraphCategoryVisibility {
    const categoryVisibility = new ColorGraphCategoryVisibility();

    return categoryVisibility;
  }
};
