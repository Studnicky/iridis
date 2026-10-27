import type { RoleRelationshipEntity } from '@studnicky/iridis';

import type { ColorGraphNodeCategory } from './ColorGraphNodeCategory.ts';

export class ColorGraphPointMeta {
  public readonly category: ColorGraphNodeCategory;
  public readonly hex: string;
  public readonly labelSuffix: string;
  public readonly name: string;
  public readonly relationship: RoleRelationshipEntity.Type | null;

  public constructor(
    category: ColorGraphNodeCategory,
    hex: string,
    labelSuffix: string,
    name: string,
    relationship: RoleRelationshipEntity.Type | null
  ) {
    this.category = category;
    this.hex = hex;
    this.labelSuffix = labelSuffix;
    this.name = name;
    this.relationship = relationship;
  }
}
