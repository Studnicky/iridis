import type { RoleSortableRowInterfaceTypeEntity } from '../composables/entities/RoleSortableRowInterfaceTypeEntity.ts';

export interface RoleSortFieldComparatorInterface {
  compare(left: RoleSortableRowInterfaceTypeEntity.Type, right: RoleSortableRowInterfaceTypeEntity.Type): number;
  readonly 'label': string;
}
