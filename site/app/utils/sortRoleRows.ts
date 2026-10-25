import type { RoleSortableRowEntity } from '../composables/entities/RoleSortableRowEntity.ts';
import type { RoleSortFieldBehaviorInterface } from './roleSortFieldBehaviorInterface.ts';

/** Applies the selected role-sort behaviors in priority order, falling through on ties. */
class SortRoleRowsOperation {
  static run<T extends RoleSortableRowEntity.Type>(
    rows: readonly T[],
    behaviors: readonly RoleSortFieldBehaviorInterface[]
  ): T[] {
    const sortedRows = [...rows].sort((left, right) => {
      for (let behaviorIndex = 0; behaviorIndex < behaviors.length; behaviorIndex += 1) {
        const behavior = behaviors[behaviorIndex];
        if (behavior === undefined) {continue;}
        const comparison = behavior.compare(left, right);
        if (comparison !== 0) {return comparison;}
      }
      const tied = 0;
      return tied;
    });
    return sortedRows;
  }
}

export const sortRoleRows = SortRoleRowsOperation.run;
