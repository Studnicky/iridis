import type { RoleSortableRowInterfaceTypeEntity } from '../composables/entities/RoleSortableRowInterfaceTypeEntity.ts';
import type { RoleSortFieldBehaviorInterface } from './roleSortFieldBehaviorInterface.ts';
import type { RoleSortFieldComparatorInterface } from './roleSortFieldComparatorInterface.ts';

class AscendingRoleSortBehavior implements RoleSortFieldBehaviorInterface {
  private readonly field: RoleSortFieldComparatorInterface;
  public readonly label: string;

  public constructor(field: RoleSortFieldComparatorInterface) {
    this.field = field;
    this.label = field.label;
  }

  public compare(left: RoleSortableRowInterfaceTypeEntity.Type, right: RoleSortableRowInterfaceTypeEntity.Type): number {
    const comparison = this.field.compare(left, right);
    return comparison;
  }

  public isDescending(): boolean {
    const descending = false;
    return descending;
  }

  public matches(field: RoleSortFieldComparatorInterface): boolean {
    const matches = this.field === field;
    return matches;
  }

  public toggleDirection(): RoleSortFieldBehaviorInterface {
    const behavior = RoleSortBehavior.descending(this.field);
    return behavior;
  }
}

class DescendingRoleSortBehavior implements RoleSortFieldBehaviorInterface {
  private readonly field: RoleSortFieldComparatorInterface;
  public readonly label: string;

  public constructor(field: RoleSortFieldComparatorInterface) {
    this.field = field;
    this.label = field.label;
  }

  public compare(left: RoleSortableRowInterfaceTypeEntity.Type, right: RoleSortableRowInterfaceTypeEntity.Type): number {
    const comparison = -this.field.compare(left, right);
    return comparison;
  }

  public isDescending(): boolean {
    const descending = true;
    return descending;
  }

  public matches(field: RoleSortFieldComparatorInterface): boolean {
    const matches = this.field === field;
    return matches;
  }

  public toggleDirection(): RoleSortFieldBehaviorInterface {
    const behavior = RoleSortBehavior.ascending(this.field);
    return behavior;
  }
}

export class RoleSortBehavior {
  public static ascending(field: RoleSortFieldComparatorInterface): RoleSortFieldBehaviorInterface {
    const behavior = new AscendingRoleSortBehavior(field);
    return behavior;
  }

  public static descending(field: RoleSortFieldComparatorInterface): RoleSortFieldBehaviorInterface {
    const behavior = new DescendingRoleSortBehavior(field);
    return behavior;
  }
}
