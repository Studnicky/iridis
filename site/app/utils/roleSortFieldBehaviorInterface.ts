import type { RoleSortableRowInterfaceTypeEntity } from '../composables/entities/RoleSortableRowInterfaceTypeEntity.ts';
import type { RoleSortFieldComparatorInterface } from './roleSortFieldComparatorInterface.ts';

export interface RoleSortFieldBehaviorInterface {
  compare(left: RoleSortableRowInterfaceTypeEntity.Type, right: RoleSortableRowInterfaceTypeEntity.Type): number;
  isDescending(): boolean;
  readonly 'label': string;
  matches(field: RoleSortFieldComparatorInterface): boolean;
  toggleDirection(): RoleSortFieldBehaviorInterface;
}
