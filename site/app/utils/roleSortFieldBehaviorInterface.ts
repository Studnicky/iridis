import type { RoleSortableRowEntity } from '../composables/entities/RoleSortableRowEntity.ts';
import type { RoleSortFieldComparatorInterface } from './roleSortFieldComparatorInterface.ts';

export interface RoleSortFieldBehaviorInterface {
  compare(left: RoleSortableRowEntity.Type, right: RoleSortableRowEntity.Type): number;
  isDescending(): boolean;
  readonly 'label': string;
  matches(field: RoleSortFieldComparatorInterface): boolean;
  toggleDirection(): RoleSortFieldBehaviorInterface;
}
