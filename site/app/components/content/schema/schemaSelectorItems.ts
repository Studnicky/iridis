import type { SchemaNameType } from '~/composables/types/schemaName.ts';

class SchemaSelectorItem {
  public readonly label: string;
  public readonly value: SchemaNameType.Type;

  public constructor(label: string, value: SchemaNameType.Type) {
    this.label = label;
    this.value = value;
  }
}

export const schemaSelectorItems = class SchemaSelectorItems {
  private static readonly items: readonly SchemaSelectorItem[] = [
    new SchemaSelectorItem('4', 'iridis-4'),
    new SchemaSelectorItem('8', 'iridis-8'),
    new SchemaSelectorItem('12', 'iridis-12'),
    new SchemaSelectorItem('16', 'iridis-16'),
    new SchemaSelectorItem('32', 'iridis-32')
  ];

  public static build(): readonly SchemaSelectorItem[] {
    const items: SchemaSelectorItem[] = [];
    for (const item of SchemaSelectorItems.items) {
      items.push(new SchemaSelectorItem(item.label, item.value));
    }
    return items;
  }
};
