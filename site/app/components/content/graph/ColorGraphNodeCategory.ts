import type { RoleMathEntry } from '~/composables/types/roleMathEntry.ts';

export class ColorGraphNodeCategory {
  public static readonly Direct = new ColorGraphNodeCategory(3, 'direct');
  public static readonly Derived = new ColorGraphNodeCategory(2, 'derived');
  public static readonly Pinned = new ColorGraphNodeCategory(0, 'pinned');
  public static readonly Synthesized = new ColorGraphNodeCategory(1, 'synthesized');

  private static readonly categoryByIdentifier = new Map<string, ColorGraphNodeCategory>([
    ['derived', ColorGraphNodeCategory.Derived],
    ['direct', ColorGraphNodeCategory.Direct],
    ['pinned', ColorGraphNodeCategory.Pinned],
    ['synthesized', ColorGraphNodeCategory.Synthesized]
  ]);

  private static readonly categoryByIndex = new Map<number, ColorGraphNodeCategory>([
    [ColorGraphNodeCategory.Derived.index, ColorGraphNodeCategory.Derived],
    [ColorGraphNodeCategory.Direct.index, ColorGraphNodeCategory.Direct],
    [ColorGraphNodeCategory.Pinned.index, ColorGraphNodeCategory.Pinned],
    [ColorGraphNodeCategory.Synthesized.index, ColorGraphNodeCategory.Synthesized]
  ]);

  public readonly index: number;
  public readonly identifier: string;

  private constructor(index: number, identifier: string) {
    this.index = index;
    this.identifier = identifier;
  }

  public static fromIdentifier(identifier: string): ColorGraphNodeCategory | null {
    const category = ColorGraphNodeCategory.categoryByIdentifier.get(identifier) ?? null;
    return category;
  }

  public static fromIndex(index: number): ColorGraphNodeCategory | null {
    const category = ColorGraphNodeCategory.categoryByIndex.get(index) ?? null;
    return category;
  }

  public static fromRole(role: RoleMathEntry): ColorGraphNodeCategory {
    if (role.origin.isPinned()) {return ColorGraphNodeCategory.Pinned;}
    if (role.origin.isSynthesized()) {return ColorGraphNodeCategory.Synthesized;}
    if (role.origin.isDerived()) {return ColorGraphNodeCategory.Derived;}
    return ColorGraphNodeCategory.Direct;
  }
}
