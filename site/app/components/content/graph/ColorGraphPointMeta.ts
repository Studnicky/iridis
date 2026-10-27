import type { ColorGraphNodeCategory } from './ColorGraphNodeCategory.ts';

export class ColorGraphPointMeta {
  public readonly category: ColorGraphNodeCategory;
  public readonly hex: string;
  public readonly labelSuffix: string;
  public readonly name: string;
  public readonly relationshipOperation: string | null;

  public constructor(
    category: ColorGraphNodeCategory,
    hex: string,
    labelSuffix: string,
    name: string,
    relationshipOperation: string | null
  ) {
    this.category = category;
    this.hex = hex;
    this.labelSuffix = labelSuffix;
    this.name = name;
    this.relationshipOperation = relationshipOperation;
  }
}
