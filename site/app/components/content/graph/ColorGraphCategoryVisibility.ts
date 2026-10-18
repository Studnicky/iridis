import { ColorGraphNodeCategory } from './ColorGraphNodeCategory.ts';

export class ColorGraphCategoryVisibility {
  public readonly visibleByCategory: Map<ColorGraphNodeCategory, boolean>;

  public constructor() {
    this.visibleByCategory = new Map<ColorGraphNodeCategory, boolean>([
      [ColorGraphNodeCategory.Derived, true],
      [ColorGraphNodeCategory.Direct, true],
      [ColorGraphNodeCategory.Pinned, true],
      [ColorGraphNodeCategory.Synthesized, true]
    ]);
  }

  public isVisible(category: ColorGraphNodeCategory): boolean {
    const visible = this.visibleByCategory.get(category) === true;
    return visible;
  }

  public isIndexVisible(index: number): boolean {
    const category = ColorGraphNodeCategory.fromIndex(index);
    const visible = category !== null && this.isVisible(category);
    return visible;
  }

  public toggleIdentifier(identifier: string): void {
    const category = ColorGraphNodeCategory.fromIdentifier(identifier);
    if (category === null) {return;}
    this.visibleByCategory.set(category, !this.isVisible(category));
  }
}
