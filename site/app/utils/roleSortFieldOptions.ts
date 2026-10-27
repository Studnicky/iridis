import type { RoleSortableRowEntity } from '../composables/entities/RoleSortableRowEntity.ts';
import type { RoleSortFieldComparatorInterface } from './roleSortFieldComparatorInterface.ts';

class RoleNameSortBehavior implements RoleSortFieldComparatorInterface {
  public readonly label = 'Role name';

  public compare(left: RoleSortableRowEntity.Type, right: RoleSortableRowEntity.Type): number {
    const comparison = left.name.localeCompare(right.name);
    return comparison;
  }
}

class LightnessSortBehavior implements RoleSortFieldComparatorInterface {
  public readonly label = 'Lightness';

  public compare(left: RoleSortableRowEntity.Type, right: RoleSortableRowEntity.Type): number {
    const comparison = left.l - right.l;
    return comparison;
  }
}

class ChromaSortBehavior implements RoleSortFieldComparatorInterface {
  public readonly label = 'Chroma';

  public compare(left: RoleSortableRowEntity.Type, right: RoleSortableRowEntity.Type): number {
    const comparison = left.c - right.c;
    return comparison;
  }
}

class HueSortBehavior implements RoleSortFieldComparatorInterface {
  public readonly label = 'Hue';

  public compare(left: RoleSortableRowEntity.Type, right: RoleSortableRowEntity.Type): number {
    const comparison = left.h - right.h;
    return comparison;
  }
}

class RatioSortBehavior implements RoleSortFieldComparatorInterface {
  public readonly label = 'Ratio';

  public compare(left: RoleSortableRowEntity.Type, right: RoleSortableRowEntity.Type): number {
    const comparison = left.ratio - right.ratio;
    return comparison;
  }
}

class ComplianceSortBehavior implements RoleSortFieldComparatorInterface {
  public readonly label = 'Compliance';
  private readonly rankByCompliance = new Map<string, number>([
    ['AA', 1],
    ['AAA', 2],
    ['fail', 0],
    ['n/a', -1]
  ]);

  public compare(left: RoleSortableRowEntity.Type, right: RoleSortableRowEntity.Type): number {
    const leftRank = this.rankByCompliance.get(left.compliance) ?? 0;
    const rightRank = this.rankByCompliance.get(right.compliance) ?? 0;
    const comparison = leftRank - rightRank;
    return comparison;
  }
}

export const ROLE_SORT_FIELD_OPTIONS: readonly {
  readonly 'key': string;
  readonly 'label': string;
  readonly 'value': RoleSortFieldComparatorInterface;
}[] = [
  { 'key': 'name', 'label': 'Role name', 'value': new RoleNameSortBehavior() },
  { 'key': 'lightness', 'label': 'Lightness', 'value': new LightnessSortBehavior() },
  { 'key': 'chroma', 'label': 'Chroma', 'value': new ChromaSortBehavior() },
  { 'key': 'hue', 'label': 'Hue', 'value': new HueSortBehavior() },
  { 'key': 'ratio', 'label': 'Ratio', 'value': new RatioSortBehavior() },
  { 'key': 'compliance', 'label': 'Compliance', 'value': new ComplianceSortBehavior() }
];
