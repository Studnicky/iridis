import type { RoleSortableRowEntity } from '../composables/entities/RoleSortableRowEntity.ts';

export interface RoleSortFieldComparatorInterface {
  compare(left: RoleSortableRowEntity.Type, right: RoleSortableRowEntity.Type): number;
  readonly 'label': string;
}
